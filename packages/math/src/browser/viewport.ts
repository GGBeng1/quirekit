import type { MathSurfaceRect } from '../geometry/types';

/**
 * Reveals a retained caret within its own scrollable surface, without moving the page.
 * @param surface - Consumer viewport owning scroll offsets.
 * @param caret - Insertion rectangle in content CSS pixels.
 */
export function revealMathCaret(surface: HTMLElement, caret: MathSurfaceRect): void {
  const width = surface.clientWidth;
  const height = surface.clientHeight;
  const left = surface.scrollLeft;
  const top = surface.scrollTop;
  const insetX = Math.min(12, width / 4);
  const insetY = Math.min(12, height / 4);
  const nextLeft = caret.left < left + insetX ? caret.left - insetX
    : caret.left + caret.width > left + width - insetX ? caret.left + caret.width - width + insetX : left;
  const nextTop = caret.top < top + insetY ? caret.top - insetY
    : caret.top + caret.height > top + height - insetY ? caret.top + caret.height - height + insetY : top;
  if (nextLeft !== left) surface.scrollLeft = Math.max(0, nextLeft);
  if (nextTop !== top) surface.scrollTop = Math.max(0, nextTop);
}
