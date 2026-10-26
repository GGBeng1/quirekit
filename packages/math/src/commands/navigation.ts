import type { MathSurfaceRect } from '../geometry/types';

/**
 * Moves between actual tile centers, including wide presets that span several columns.
 * @param rectangles - Consumer-measured choices in catalog order.
 * @param current - Current catalog index.
 * @param key - One directional arrow key.
 * @returns Nearest choice in the requested visual direction, or the retained index.
 */
export function moveMathCommand(rectangles: readonly MathSurfaceRect[], current: number, key: string): number {
  const origin = rectangles[current];
  if (!origin) return 0;
  const horizontal = key === 'ArrowLeft' || key === 'ArrowRight';
  const sign = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  const x = origin.left + origin.width / 2;
  const y = origin.top + origin.height / 2;
  let next = current; let nearest = Infinity;
  rectangles.forEach((rect, index) => {
    const dx = rect.left + rect.width / 2 - x;
    const dy = rect.top + rect.height / 2 - y;
    const primary = horizontal ? dx : dy;
    const cross = horizontal ? dy : dx;
    if (primary * sign <= 1 || horizontal && Math.abs(cross) > Math.max(origin.height, rect.height) / 2) return;
    const score = Math.abs(primary) + Math.abs(cross) * 2;
    if (score < nearest) { nearest = score; next = index; }
  });
  return next;
}
