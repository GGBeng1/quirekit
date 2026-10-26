import type { QuireLayoutDocument } from "../layout/engine/types";
import type { QuireLayoutPage } from "../layout/types";

/**
 * Adapts one engine page fragment to snapshot page metadata.
 *
 * @param page - Engine page fragment, possibly carrying column separators.
 * @returns Snapshot page metadata.
 */
export function adaptQuireLayoutPage(page: QuireLayoutDocument["pages"][number]): QuireLayoutPage {
  const columnSeparators = page.columnSeparators ?? [];
  return {
    pageIndex: page.pageIndex,
    range: page.range,
    pageRect: page.pageRect,
    bodyRect: page.bodyRect,
    ...(page.terminalPlacement === undefined ? {} : { terminalPlacement: page.terminalPlacement }),
    ...(columnSeparators.length === 0 ? {} : { columnSeparators }),
    ...(page.noteSeparators === undefined || page.noteSeparators.length === 0 ? {} : { noteSeparators: page.noteSeparators }),
    ...(page.noteRanges === undefined || page.noteRanges.length === 0 ? {} : { noteRanges: page.noteRanges })
  };
}
