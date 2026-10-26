import type { QuireRect } from "@quirekit/renderer";
import type { QuireTableCellFragment } from "../../../../table";

/**
 * Resolves the rectangle used to place child content inside a table cell.
 *
 * @param cell - Table cell fragment whose content child is being cloned.
 * @returns Content layout rectangle, falling back to the clipping rectangle.
 */
export function resolveQuireTableCellContentLayoutRect(
  cell: QuireTableCellFragment
): QuireRect {
  return cell.contentLayoutRect ?? cell.contentRect;
}
