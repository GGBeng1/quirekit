import type { MathVisualSelection } from '../visual/types';
import type { MathEditorOverlay, MathOverlayOptions, MathSurfaceSlot } from './types';

/**
 * Computes custom cursor and selection decorations without DOM or formula layout work.
 * @param geometry - Current retained projected slots.
 * @param selection - Canonical complete child boundaries.
 * @param options - Consumer's cursor dimensions.
 * @returns Numeric decoration rectangles in surface content pixels.
 */
export function getMathOverlay(geometry: readonly MathSurfaceSlot[], selection: MathVisualSelection, options: MathOverlayOptions = {}): MathEditorOverlay {
  const slot = geometry.find(item => item.id === selection.focus.slot);
  if (!slot) return { selected: [] };
  const index = selection.focus.index;
  const child = slot.children[Math.min(index, slot.children.length - 1)] ?? slot.rect;
  const caret = { left: slot.emptyCenter ?? slot.boundaries[index] ?? slot.rect.left, top: child.top, width: options.caretWidth ?? 1,
    height: Math.max(options.minCaretHeight ?? 14, Math.min(options.maxCaretHeight ?? 40, child.height)) };
  const anchor = selection.anchor;
  const selected = anchor?.slot === slot.id ? slot.children.slice(Math.min(anchor.index, index), Math.max(anchor.index, index)) : [];
  return { active: slot.rect, caret, selected };
}
