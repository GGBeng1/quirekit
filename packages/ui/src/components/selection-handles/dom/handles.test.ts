import { describe, expect, it } from 'vitest';
import { canContinueHandleDrag, getHandlePresentation } from './handles';
import { en } from '../../../locale/components/selection-handles';

const a = { x: 10, y: 30, height: 20 };
const b = { x: 40, y: 60, height: 20 };
describe('controlled endpoint presentation', () => {
  it('keeps only an accepted caret hold alive when the host first creates a range', () => {
    const caret = { selection: { type: 'caret' as const, caret: a } };
    const range = { selection: { type: 'range' as const, anchor: a, focus: b } };
    expect(canContinueHandleDrag(caret, range, 'caret', false)).toBe(false);
    expect(canContinueHandleDrag(caret, range, 'caret', true)).toBe(true);
    expect(canContinueHandleDrag(range, range, 'caret', true)).toBe(true);
    expect(canContinueHandleDrag(range, caret, 'caret', true)).toBe(false);
    expect(canContinueHandleDrag(caret, range, 'anchor', true)).toBe(false);
  });
  it('cancels a promoted caret when its new focus is invalidated or interaction is disabled', () => {
    const range = { selection: { type: 'range' as const, anchor: a, focus: b } };
    expect(canContinueHandleDrag(range, { ...range, disabled: true }, 'caret', true)).toBe(false);
    expect(canContinueHandleDrag(range, { selection: null }, 'caret', true)).toBe(false);
    expect(canContinueHandleDrag(range, { selection: { ...range.selection, focus: null } }, 'caret', true)).toBe(false);
  });
  it('defaults to a single bottom grip only for an explicit caret', () => {
    const state = { selection: { type: 'caret' as const, caret: a } };
    expect(getHandlePresentation(state, 'caret')).toMatchObject({ geometry: a, side: 'end', label: '移动光标' });
    expect(getHandlePresentation(state, 'anchor')).toBeNull();
  });
  it('swaps range appearance without changing anchor and focus identity', () => {
    const state = { selection: { type: 'range' as const, anchor: a, focus: b, backward: true } };
    expect(getHandlePresentation(state, 'anchor')).toMatchObject({ geometry: a, side: 'end', label: '调整选区终点' });
    expect(getHandlePresentation(state, 'focus')).toMatchObject({ geometry: b, side: 'start', label: '调整选区起点' });
    expect(getHandlePresentation({ ...state, selecting: true }, 'focus')).toMatchObject({ side: 'end', boundary: 'start' });
  });
  it('does not infer a collapsed selection from coincident range geometry', () => {
    const state = { selection: { type: 'range' as const, anchor: a, focus: a } };
    expect(getHandlePresentation(state, 'caret')).toBeNull();
    expect(getHandlePresentation(state, 'anchor')).not.toBeNull();
    expect(getHandlePresentation(state, 'focus')).not.toBeNull();
  });
  it('hides missing or invalid endpoints without hiding the other endpoint', () => {
    for (const anchor of [null, { ...a, x: NaN }, { ...a, height: 0 }]) {
      const state = { selection: { type: 'range' as const, anchor, focus: b } };
      expect(getHandlePresentation(state, 'anchor')).toBeNull();
      expect(getHandlePresentation(state, 'focus')).not.toBeNull();
    }
  });
  it('names handles with the supplied language messages', () => {
    const range = { selection: { type: 'range' as const, anchor: a, focus: b }, messages: en };
    expect(getHandlePresentation(range, 'anchor')).toMatchObject({ label: 'Adjust selection start' });
    expect(getHandlePresentation(range, 'focus')).toMatchObject({ label: 'Adjust selection end' });
    expect(getHandlePresentation({ selection: { type: 'caret' as const, caret: a }, messages: en }, 'caret')).toMatchObject({ label: 'Move cursor' });
  });
});
