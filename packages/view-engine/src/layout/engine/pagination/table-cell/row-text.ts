import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireSubLayoutProjection } from "../../sub-layout";
import {
  doesQuireTextFragmentBaselineBelongToRectY,
  groupQuireTextFragmentsIntoLines
} from "@quirekit/layout/pagination";
import {
  createQuireTableCellSliceIdentity
} from "../../table/sub-layout";
import type {
  QuireTableCellRowLineSlice,
  QuireTableCellRowSubLayoutProjectionInput,
  QuireTableCellRowTextSlice
} from "./types";

/**
 * Collects row-owned text slices from table-cell sub-layout projections.
 *
 * @param input - Row, covering cells, and table-cell sub-layout results.
 * @returns Cell text slices that contribute visible text to the row.
 */
export function collectQuireTableCellRowTextSlices(
  input: QuireTableCellRowSubLayoutProjectionInput
): readonly QuireTableCellRowTextSlice[] {
  const rowCells = input.cells.filter((cell) =>
    cell.gridRect.startRow <= input.row.rowIndex &&
    input.row.rowIndex < cell.gridRect.startRow + cell.gridRect.rowSpan
  );

  return rowCells.flatMap((cell): readonly QuireTableCellRowTextSlice[] => {
    const result = input.subLayoutProjectionByCellId.get(cell.id);

    if (result === undefined) {
      return [];
    }

    const fragments = collectQuireSubLayoutProjectionTextFragments(result).filter((fragment) =>
      doesQuireTextFragmentBaselineBelongToRectY(fragment, input.row.rect) &&
      doesQuireTextFragmentBaselineBelongToRectY(fragment, cell.contentRect)
    );

    if (fragments.length === 0) {
      return [];
    }

    return [
      {
        ...createQuireTableCellSliceIdentity(cell),
        range: cell.range,
        contentRect: cell.contentRect,
        fragments
      }
    ];
  });
}

/**
 * Collects row-owned visual line slices from table-cell sub-layout projections.
 *
 * @param input - Row, covering cells, and table-cell sub-layout results.
 * @returns Cell-owned line slices in source-flow order.
 */
export function collectQuireTableCellRowLineSlices(
  input: QuireTableCellRowSubLayoutProjectionInput
): readonly QuireTableCellRowLineSlice[] {
  return collectQuireTableCellRowTextSlices(input)
    .flatMap((slice) =>
      groupQuireTextFragmentsIntoLines(slice.fragments).map((line) => ({
        cellId: slice.cellId,
        semanticCellId: slice.semanticCellId,
        originExplicitCellId: slice.originExplicitCellId,
        explicitCellIds: slice.explicitCellIds,
        originCellPos: slice.originCellPos,
        gridRect: slice.gridRect,
        cellRange: slice.range,
        contentRect: slice.contentRect,
        from: line.from,
        to: line.to,
        top: line.top,
        bottom: line.bottom
      }))
    )
    .sort(compareQuireTableCellRowLineSlices);
}

/**
 * Sorts cell line slices into row source-flow order.
 *
 * @param first - First cell line slice.
 * @param second - Second cell line slice.
 * @returns Negative when first should sort before second.
 */
export function compareQuireTableCellRowLineSlices(
  first: QuireTableCellRowLineSlice,
  second: QuireTableCellRowLineSlice
): number {
  if (first.top !== second.top) {
    return first.top - second.top;
  }

  if (first.contentRect.x !== second.contentRect.x) {
    return first.contentRect.x - second.contentRect.x;
  }

  return first.from - second.from;
}

/**
 * Collects text fragments owned by a sub-layout projection's accepted geometry.
 *
 * @param projection - Sub-layout projection to inspect.
 * @returns Text fragments owned by accepted child fragments.
 */
function collectQuireSubLayoutProjectionTextFragments(
  projection: QuireSubLayoutProjection
): readonly QuireTextFragment[] {
  return projection.geometry.fragments.flatMap((fragment) =>
    fragment.textFragments ?? []
  );
}
