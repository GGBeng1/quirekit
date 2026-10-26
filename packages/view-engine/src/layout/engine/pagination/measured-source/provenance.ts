import type {
  QuireMeasuredContainerSourceFragment,
  QuireTextLineGroup
} from "@quirekit/layout/pagination";
import type { QuireTableCellRowLineSlice } from "../table-cell";

/**
 * Creates provenance for a paragraph/block text line.
 *
 * @param ownerId - Layout box that owns the text line.
 * @param line - Text line grouped from that owner.
 * @returns Source fragment carried by the measured item.
 */
export function createQuireTextLineSourceFragment(
  ownerId: string,
  line: QuireTextLineGroup
): QuireMeasuredContainerSourceFragment {
  return {
    kind: "textLine",
    ownerId,
    range: { from: line.from, to: line.to },
    flowTop: line.top,
    flowBottom: line.bottom
  };
}

/**
 * Creates provenance for a table-cell text line contributing to row measurement.
 *
 * @param line - Cell-owned text line slice.
 * @returns Source fragment carried by the measured row item.
 */
export function createQuireTableCellLineSourceFragment(
  line: QuireTableCellRowLineSlice
): QuireMeasuredContainerSourceFragment {
  return {
    kind: "tableCellLine",
    ownerId: line.cellId,
    semanticOwnerId: line.semanticCellId,
    originOwnerId: line.originExplicitCellId,
    explicitOwnerIds: line.explicitCellIds,
    originOwnerPos: line.originCellPos,
    gridRect: line.gridRect,
    range: { from: line.from, to: line.to },
    flowTop: line.top,
    flowBottom: line.bottom
  };
}
