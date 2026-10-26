import { describe, expect, it, vi } from 'vitest';
import { createSelectionHandleDrag } from './controller';

/** @returns A deterministic frame scheduler and observed drag session. */
function fixture() {
  const frames = new Map<number, () => void>();
  const timers = new Map<number, () => void>();
  let sequence = 0;
  const start = vi.fn();
  const move = vi.fn();
  const end = vi.fn();
  const ready = vi.fn();
  const delay = vi.fn((callback: () => void, _ms: number) => { timers.set(++sequence, callback); return sequence; });
  const drag = createSelectionHandleDrag({
    schedule: callback => { frames.set(++sequence, callback); return sequence; },
    cancelFrame: id => { frames.delete(id); },
    delay, cancelDelay: id => { timers.delete(id); },
    onStart: start, onMove: move, onEnd: end, onLongPressStart: ready
  });
  /** Flushes precisely one presentation frame. */
  function frame(): void {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback());
  }
  /** Reaches the pending hold deadline once. */
  function hold(): void { const pending = [...timers.values()]; timers.clear(); pending.forEach(callback => callback()); }
  return { drag, frames, frame, start, move, end, ready, timers, delay, hold };
}

const initial = {
  handle: 'focus' as const, pointerId: 4, pointerType: 'touch',
  point: { x: 80, y: 100 }, pointer: { x: 85, y: 125 }
};

describe('selection handle drag lifecycle', () => {
  it('enters selection readiness when the caret is held, without a drag or release', () => {
    const f = fixture();
    const caret = { ...initial, handle: 'caret' as const };
    f.drag.begin(caret);
    expect(f.delay.mock.calls[0]![1]).toBe(450);
    f.drag.move(4, { x: 88, y: 128 });
    f.frame();
    expect(f.move).not.toHaveBeenCalled();
    f.hold();
    expect(f.ready).toHaveBeenCalledExactlyOnceWith(caret);
    expect(f.drag.selecting()).toBe(true);
    expect(f.end).not.toHaveBeenCalled();
    f.drag.release(4, { x: 88, y: 128 });
    expect(f.end.mock.calls[0]![0].reason).toBe('long-press');
    expect(f.move).not.toHaveBeenCalled();
    expect(f.drag.selecting()).toBe(false);
  });

  it('keeps direct caret movement as a normal drag and cancels its pending hold', () => {
    const f = fixture();
    f.drag.begin({ ...initial, handle: 'caret' });
    f.drag.move(4, { x: 130, y: 125 });
    f.frame();
    f.hold();
    expect(f.ready).not.toHaveBeenCalled();
    expect(f.drag.selecting()).toBe(false);
    expect(f.move.mock.calls[0]![0].point).toEqual({ x: 125, y: 100 });
    f.drag.release(4, { x: 135, y: 125 });
    expect(f.end.mock.calls[0]![0].reason).toBe('release');
  });

  it('keeps the held caret identity while extending and flushes its final point', () => {
    const f = fixture();
    f.drag.begin({ ...initial, handle: 'caret' });
    f.hold();
    f.drag.move(4, { x: 30, y: 150 });
    f.frame();
    expect(f.drag.selecting()).toBe(true);
    expect(f.move.mock.calls[0]![0]).toMatchObject({ handle: 'caret', point: { x: 25, y: 125 } });
    f.drag.release(4, { x: 20, y: 160 });
    expect(f.end.mock.calls[0]![0]).toMatchObject({ reason: 'release', handle: 'caret', point: { x: 15, y: 135 } });
    expect(f.end).toHaveBeenCalledTimes(1);
  });

  it('accepts a final extension on release even without an intervening move event', () => {
    const f = fixture();
    f.drag.begin({ ...initial, handle: 'caret' }, { longPressDelay: 700 });
    expect(f.delay.mock.calls[0]![1]).toBe(700);
    f.hold();
    f.drag.release(4, { x: 20, y: 160 });
    expect(f.move).toHaveBeenCalledTimes(1);
    expect(f.end.mock.calls[0]![0]).toMatchObject({ reason: 'release', point: { x: 15, y: 135 } });
  });

  it('does not re-enter a hold when readiness synchronously invalidates the host target', () => {
    const f = fixture();
    f.ready.mockImplementation(() => f.drag.cancel('selection-change'));
    f.drag.begin({ ...initial, handle: 'caret' });
    f.hold();
    f.drag.release(4, initial.pointer);
    expect(f.drag.selecting()).toBe(false);
    expect(f.end).toHaveBeenCalledTimes(1);
    expect(f.end.mock.calls[0]![0].reason).toBe('selection-change');
  });

  it.each(['escape', 'disabled', 'destroy'] as const)('drops a pending and accepted caret hold on %s', reason => {
    const f = fixture();
    f.drag.begin({ ...initial, handle: 'caret' });
    f.drag.cancel(reason);
    f.hold();
    expect(f.ready).not.toHaveBeenCalled();
    f.drag.begin({ ...initial, handle: 'caret' });
    f.hold();
    f.drag.cancel(reason);
    f.drag.release(4, initial.pointer);
    expect(f.end.mock.calls.map(([detail]) => detail.reason)).toEqual([reason, reason]);
    expect(f.timers.size).toBe(0);
  });

  it('coalesces movement and preserves the grab offset without an initial jump', () => {
    const f = fixture();
    expect(f.drag.begin(initial)).toBe(true);
    expect(f.timers.size).toBe(0);
    expect(f.start).toHaveBeenCalledWith(initial);
    expect(f.move).not.toHaveBeenCalled();
    for (let x = 86; x <= 185; x++) f.drag.move(4, { x, y: 140 });
    expect(f.frames.size).toBe(1);
    f.frame();
    expect(f.move).toHaveBeenCalledTimes(1);
    expect(f.move.mock.calls[0]![0]).toEqual({ ...initial, point: { x: 180, y: 115 }, pointer: { x: 185, y: 140 } });
    expect(f.frames.size).toBe(0);
  });

  it('flushes the actual release point synchronously instead of the last move', () => {
    const f = fixture();
    f.drag.begin(initial);
    f.drag.move(4, { x: 100, y: 130 });
    f.drag.release(4, { x: 200, y: 160 });
    expect(f.move).toHaveBeenCalledTimes(1);
    expect(f.move.mock.calls[0]![0].point).toEqual({ x: 195, y: 135 });
    expect(f.end.mock.calls[0]![0]).toMatchObject({ reason: 'release', point: { x: 195, y: 135 } });
    expect(f.move.mock.invocationCallOrder[0]!).toBeLessThan(f.end.mock.invocationCallOrder[0]!);
    f.frame();
    expect(f.move).toHaveBeenCalledTimes(1);
  });

  it('ignores additional pointers and retains identity while crossing the other endpoint', () => {
    const f = fixture();
    f.drag.begin(initial);
    expect(f.drag.begin({ ...initial, handle: 'anchor', pointerId: 7 })).toBe(false);
    f.drag.move(7, { x: 0, y: 0 });
    f.drag.release(7, { x: 0, y: 0 });
    expect(f.frames.size).toBe(0);
    f.drag.move(4, { x: -50, y: 50 });
    f.frame();
    expect(f.move.mock.calls[0]![0]).toMatchObject({ handle: 'focus', point: { x: -55, y: 25 } });
    expect(f.end).not.toHaveBeenCalled();
  });

  it.each(['cancel', 'escape', 'capture-lost', 'blur', 'disabled', 'selection-change', 'destroy'] as const)(
    'discards pending work and ends exactly once on %s', reason => {
      const f = fixture();
      f.drag.begin(initial);
      f.drag.move(4, { x: 200, y: 160 });
      f.drag.cancel(reason);
      f.drag.cancel(reason);
      f.frame();
      f.drag.release(4, { x: 200, y: 160 });
      expect(f.move).not.toHaveBeenCalled();
      expect(f.end).toHaveBeenCalledTimes(1);
      expect(f.end.mock.calls[0]![0]).toMatchObject({ reason, point: initial.point });
      expect(f.drag.current()).toBeNull();
    }
  );

  it('supports cancellation from a consumer callback without a second completion', () => {
    const f = fixture();
    f.move.mockImplementation(() => f.drag.cancel('selection-change'));
    f.drag.begin(initial);
    f.drag.release(4, { x: 100, y: 130 });
    expect(f.end).toHaveBeenCalledTimes(1);
    expect(f.end.mock.calls[0]![0].reason).toBe('selection-change');
  });
});
