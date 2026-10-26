import type { WordTableMap, WordTableSemanticCellRef } from "../../../map";
import type { OrthogonalBorderName } from "./topology";
import type { BorderGridSegment } from "./types";

/** @param cell - Semantic cell. @param edge - Whole physical edge. @returns Grid-unit segments of that edge. */
export function borderEdgeSegments(cell: WordTableSemanticCellRef, edge: OrthogonalBorderName): readonly BorderGridSegment[] {
  const rect = cell.rect;
  const horizontal = edge === "top" || edge === "bottom";
  const start = horizontal ? rect.startColumn : rect.startRow;
  const span = horizontal ? rect.columnSpan : rect.rowSpan;
  const line = edge === "top" ? rect.startRow : edge === "bottom" ? rect.startRow + rect.rowSpan
    : edge === "left" ? rect.startColumn : rect.startColumn + rect.columnSpan;
  return Array.from({ length: span }, (_, index) => ({ axis: horizontal ? "horizontal" : "vertical", line, offset: start + index }));
}

/** @param segment - Grid unit. @returns Stable physical-edge identity. */
export function borderSegmentKey(segment: BorderGridSegment): string {
  return `${segment.axis}:${segment.line}:${segment.offset}`;
}

/** @param map - Canonical map. @param segment - Physical grid unit. @returns Valid owners on either side, excluding merged interiors. */
export function borderSegmentOwners(map: WordTableMap, segment: BorderGridSegment): readonly (readonly [WordTableSemanticCellRef, OrthogonalBorderName])[] {
  const { axis, line, offset } = segment;
  const before = axis === "horizontal" ? map.cellAt(line - 1, offset) : map.cellAt(offset, line - 1);
  const after = axis === "horizontal" ? map.cellAt(line, offset) : map.cellAt(offset, line);
  if (before && before.id === after?.id) return [];
  return [
    ...(before ? [[before, axis === "horizontal" ? "bottom" : "right"] as const] : []),
    ...(after ? [[after, axis === "horizontal" ? "top" : "left"] as const] : [])
  ];
}
