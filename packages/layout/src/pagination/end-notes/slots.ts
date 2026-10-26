import type { QuirePageFragment } from "../types";
import type { QuireResolvedPageGeometry } from "../geometry";
import type { QuireEndNoteSlot } from "./types";

/** Tolerance for comparing edges in CSS pixels. */
const epsilon = 0.01;

/**
 * Lists the space left on the flow's last page, starting in the column where the flow ended.
 *
 * Each slot ends above its page-bottom note area, so end notes never cover
 * notes placed at the bottom of the same page or column.
 *
 * @param page - Last accepted page fragment.
 * @param fragmentIndex - Index of that fragment.
 * @param geometry - Resolved geometry of the page.
 * @returns Slots in flow order.
 */
export function listQuireLastPageEndNoteSlots(
  page: QuirePageFragment,
  fragmentIndex: number,
  geometry: QuireResolvedPageGeometry
): QuireEndNoteSlot[] {
  const pageBottom = page.noteAreaBottom ?? page.bodyRect.y + page.bodyRect.height;
  if (geometry.columnRects === undefined) {
    const top = page.rect.y + page.rect.height;
    return [{ fragmentIndex, x: page.bodyRect.x, width: page.bodyRect.width, top,
      bottom: pageBottom - (page.noteAreaHeight ?? 0), atBodyTop: top <= page.bodyRect.y + epsilon }];
  }
  const columns = page.columns ?? [];
  const filled = columns.filter((column) => column.rect.height > epsilon);
  const lastIndex = filled.at(-1)?.columnIndex ?? 0;
  return geometry.columnRects.slice(lastIndex).map((rect, offset) => {
    const columnIndex = lastIndex + offset;
    const column = columns.find((candidate) => candidate.columnIndex === columnIndex);
    const bodyTop = column?.bodyRect.y ?? page.bodyRect.y;
    const top = offset === 0 && column !== undefined ? column.rect.y + column.rect.height : bodyTop;
    return { fragmentIndex, x: rect.x, width: rect.width, top,
      bottom: pageBottom - (column?.noteAreaHeight ?? 0), atBodyTop: top <= bodyTop + epsilon };
  });
}

/**
 * Lists the slots of a page holding nothing but end notes.
 *
 * @param fragmentIndex - Index the appended fragment will take.
 * @param geometry - Resolved geometry of the page.
 * @returns One slot per column, or one for the whole body.
 */
export function listQuireAppendedPageEndNoteSlots(
  fragmentIndex: number,
  geometry: QuireResolvedPageGeometry
): QuireEndNoteSlot[] {
  const rects = geometry.columnRects ?? [geometry.bodyRect];
  return rects.map((rect) => ({ fragmentIndex, x: rect.x, width: rect.width, top: rect.y,
    bottom: rect.y + rect.height, atBodyTop: true }));
}
