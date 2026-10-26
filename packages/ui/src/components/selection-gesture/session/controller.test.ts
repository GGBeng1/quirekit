import { describe, expect, it, vi } from 'vitest';
import { createSelectionGestureSession } from './controller';

/** @returns Deterministic hold and frame controls with observed events. */
function fixture() {
  let held: (() => void) | undefined;
  let frame: (() => void) | undefined;
  const events = { onLongPressStart: vi.fn(), onLongPress: vi.fn(), onSelectionStart: vi.fn(), onSelectionChange: vi.fn(), onSelectionComplete: vi.fn(), onCancel: vi.fn() };
  const session = createSelectionGestureSession({
    ...events, delay: callback => { held = callback; return 1; }, cancelDelay: () => { held = undefined; },
    frame: callback => { frame = callback; return 2; }, cancelFrame: () => { frame = undefined; }
  });
  return { session, events, hold: () => held?.(), frame: () => { const callback = frame; frame = undefined; callback?.(); } };
}
const initial = { pointerId: 1, pointerType: 'touch', origin: { x: 20, y: 30 }, point: { x: 20, y: 30 } };

describe('surface long press recognition', () => {
  it('reports a simple action request only when an accepted hold is released without dragging', () => {
    const f = fixture();
    f.session.begin(initial, {});
    f.hold();
    expect(f.events.onLongPressStart).toHaveBeenCalledOnce();
    expect(f.events.onLongPress).not.toHaveBeenCalled();
    f.session.move(1, { x: 23, y: 30 });
    f.session.release(1, { x: 23, y: 30 });
    expect(f.events.onLongPress).toHaveBeenCalledOnce();
    expect(f.events.onSelectionComplete).not.toHaveBeenCalled();
  });
  it('yields to pre-hold scroll and does not recognize a quick tap or a mouse by default', () => {
    for (const kind of ['scroll', 'tap', 'mouse']) {
      const f = fixture();
      f.session.begin({ ...initial, pointerType: kind === 'mouse' ? 'mouse' : 'touch' }, {});
      if (kind === 'scroll') f.session.move(1, { x: 20, y: 42 });
      if (kind === 'tap') f.session.release(1, initial.point);
      f.hold();
      expect(f.events.onLongPressStart).not.toHaveBeenCalled();
      expect(f.session.phase()).toBe('idle');
    }
  });
  it('tracks during dragging, coalesces latest input, then completes once with the release point', () => {
    const f = fixture();
    f.session.begin(initial, {});
    f.hold();
    for (let x = 40; x <= 80; x++) f.session.move(1, { x, y: 50 });
    expect(f.events.onSelectionStart).toHaveBeenCalledOnce();
    expect(f.events.onSelectionChange).not.toHaveBeenCalled();
    f.frame();
    expect(f.events.onSelectionChange).toHaveBeenCalledWith({ ...initial, point: { x: 80, y: 50 } });
    f.session.release(1, { x: 100, y: 65 });
    f.frame();
    expect(f.events.onSelectionChange).toHaveBeenCalledTimes(2);
    expect(f.events.onSelectionComplete).toHaveBeenCalledWith({ ...initial, point: { x: 100, y: 65 } });
    expect(f.events.onLongPress).not.toHaveBeenCalled();
  });
  it.each(['cancel', 'multitouch', 'scroll', 'blur', 'disabled', 'destroy', 'escape'] as const)('cancels %s without a trailing menu request', reason => {
    const f = fixture();
    f.session.begin(initial, {});
    f.hold();
    f.session.move(1, { x: 80, y: 50 });
    f.session.cancel(reason);
    f.frame();
    f.session.release(1, initial.point);
    expect(f.events.onCancel).toHaveBeenCalledOnce();
    expect(f.events.onLongPress).not.toHaveBeenCalled();
    expect(f.events.onSelectionComplete).not.toHaveBeenCalled();
    expect(f.events.onSelectionChange).not.toHaveBeenCalled();
  });
  it('honors cancellation from the last selection update', () => {
    const f = fixture();
    f.events.onSelectionChange.mockImplementation(() => f.session.cancel('destroy'));
    f.session.begin(initial, {});
    f.hold();
    f.session.release(1, { x: 80, y: 50 });
    expect(f.events.onCancel).toHaveBeenCalledOnce();
    expect(f.events.onSelectionComplete).not.toHaveBeenCalled();
  });
});
