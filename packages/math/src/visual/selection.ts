import type { MathVisualSelection, MathVisualSlot } from './types';

/**
 * Validates external endpoints against the current retained structural index.
 * @param slots - Slots of the exact accepted document.
 * @param selection - Requested syntax-safe endpoints.
 * @returns Whether every endpoint is a complete child boundary in the same slot.
 */
export function isMathSelection(slots: readonly MathVisualSlot[], selection: MathVisualSelection): boolean {
  const slot = slots.find(item => item.id === selection.focus.slot);
  if (!slot || selection.anchor && selection.anchor.slot !== slot.id) return false;
  return [selection.focus, ...(selection.anchor ? [selection.anchor] : [])]
    .every(caret => Number.isInteger(caret.index) && caret.index >= 0 && caret.index <= slot.sequence.children.length);
}

/**
 * Restores a caret after source replacement without entering LaTeX syntax.
 * @param slots - New accepted structural index.
 * @param selection - Previous or explicitly requested endpoints.
 * @returns Valid detached endpoints, dropping an invalid selection origin.
 */
export function restoreMathSelection(slots: readonly MathVisualSlot[], selection: MathVisualSelection): MathVisualSelection {
  const slot = slots.find(item => item.id === selection.focus.slot) ?? slots[0]!;
  const focus = { slot: slot.id, index: Math.max(0, Math.min(slot.sequence.children.length, selection.focus.index)) };
  const anchor = selection.anchor?.slot === slot.id ? { slot: slot.id, index: Math.max(0, Math.min(slot.sequence.children.length, selection.anchor.index)) } : undefined;
  return { focus, ...(anchor ? { anchor } : {}) };
}
