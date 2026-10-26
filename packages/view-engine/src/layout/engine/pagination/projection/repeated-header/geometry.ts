import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableRowFragment } from "../../../table";
import type { QuireRepeatedTableHeaderState } from "../../repeated-table-headers";
import type { QuireSourceFlowClip } from "../source-flow";
import { createQuireTableRowsFlowClip } from "../table/row-coverage";

/**
 * Resolves the source-space vertical band covered by repeated header rows.
 *
 * @param repeatedHeader - Repeated header state for the page.
 * @param rows - Source table rows.
 * @returns Source header band, or null when rows are unavailable.
 */
export function resolveQuireRepeatedHeaderSourceBand(
  repeatedHeader: QuireRepeatedTableHeaderState | null,
  rows: readonly QuireTableRowFragment[]
): QuireSourceFlowClip | null {
  if (repeatedHeader === null) {
    return null;
  }

  const rowIndexes = new Set(repeatedHeader.rowIndexes);
  return createQuireTableRowsFlowClip(
    rows.filter((row) => rowIndexes.has(row.rowIndex))
  );
}

/**
 * Translates a rectangle vertically in flow space.
 *
 * @param rect - Rectangle to translate.
 * @param deltaY - Vertical delta to apply.
 * @returns Translated rectangle.
 */
export function translateQuireRepeatedHeaderRectY(
  rect: QuireRect,
  deltaY: number
): QuireRect {
  return {
    ...rect,
    y: rect.y + deltaY
  };
}
