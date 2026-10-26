import { resolveQuireTableBorderLineDash } from "../style";
import { expandQuireTableBorderPaintStrokes } from "./strokes";
import type { QuireResolvedTableBorderSegment, QuireTableBorderPaint } from "../../types";

/** Line cap used by table borders to avoid visible gaps at adjacent endpoints. */
const tableBorderLineCap = "square";

/**
 * Line cap of vertical lines in a collapsed table: horizontal lines fill their bands and close the corners with
 * square caps, so vertical lines stop exactly at the table's top and bottom edges.
 */
const bandedVerticalLineCap = "butt";

/**
 * Converts one resolved physical border segment into paint descriptors.
 *
 * @param border - Resolved physical border segment.
 * @param offset - Distance to move the stroke across a horizontal line.
 * @param banded - Whether horizontal lines fill their bands, as in a collapsed table.
 * @returns Renderer-neutral border paint descriptors.
 */
export function createPhysicalBorderPaint(
  border: QuireResolvedTableBorderSegment,
  offset: number,
  banded: boolean
): readonly QuireTableBorderPaint[] {
  const lineDash = resolveQuireTableBorderLineDash(border.border);
  const vertical = border.line.from.x === border.line.to.x && border.line.from.y !== border.line.to.y;

  return expandQuireTableBorderPaintStrokes(border.border, {
    id: border.id,
    from: { x: border.line.from.x, y: border.line.from.y + offset },
    to: { x: border.line.to.x, y: border.line.to.y + offset },
    strokeStyle: border.strokeStyle,
    lineWidth: border.lineWidth,
    lineCap: banded && vertical ? bandedVerticalLineCap : tableBorderLineCap,
    ...(lineDash === undefined ? {} : { lineDash })
  });
}
