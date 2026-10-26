import type { QuireLayoutBox } from "../../../types";
import type { QuireLayoutBoxSubLayoutFragment } from "../../../sub-layout";
import type {
  QuireTableCellFragment,
  QuireTableLayoutSnapshot
} from "../../../table";
import {
  createQuireTableCellSubLayoutRootMap,
  type QuireTableCellSubLayoutRootMap
} from "../../../table/sub-layout";
import { cloneQuireLayoutBoxWithOffset } from "../offset-clone";
import { resolveQuireTableCellContentLayoutRect } from "../table/cell-content";
import {
  createQuireRepeatedHeaderTablePartSuffix,
  resolveQuireTablePartSourceId
} from "../table/part-ids";
import { createQuireRepeatedHeaderCellSubLayoutProjection } from "./repeated-header-result";

/**
 * Projects cloned child fragments for repeated table header cells.
 *
 * @param options - Source children, projected table snapshot, and page index.
 * @returns Repeated-header sub-layout fragments.
 */
export function createQuireRepeatedHeaderCellSubLayoutFragmentsFromSourceChildren(options: {
  /** Source table layout children in source-flow coordinates. */
  readonly sourceChildren: readonly QuireLayoutBox[];
  /** Page-local table snapshot whose repeated cells own cloned child placement. */
  readonly table: QuireTableLayoutSnapshot;
  /** Page occurrence key: the page index, or page and column on multi-column pages. */
  readonly pageIndex: number | string;
}): readonly QuireLayoutBoxSubLayoutFragment[] {
  const repeatedHeaderCells = options.table.cells.filter((cell) =>
    cell.isRepeatedHeader === true
  );
  const subLayoutRootByCellId = createQuireTableCellSubLayoutRootMap({
    cells: repeatedHeaderCells,
    children: options.sourceChildren,
    parentId: options.table.fragmentId,
    dependencySignaturePrefix: "table-repeated-header-cell",
    resolveSourceCellId: (cell) => resolveQuireTablePartSourceId(
      cell.id,
      options.pageIndex
    )
  });

  return repeatedHeaderCells
    .flatMap((cell) =>
      createQuireRepeatedHeaderCellSubLayoutFragment({
        subLayoutRootByCellId,
        cell,
        pageIndex: options.pageIndex
      })
    );
}

/**
 * Creates the source child fragment that paints inside a repeated table header.
 *
 * @param options - Sub-layout roots, projected repeated cell, and page index.
 * @returns Repeated-header fragment, or an empty list when no source child exists.
 */
function createQuireRepeatedHeaderCellSubLayoutFragment(options: {
  /** Table-cell sub-layout roots keyed by repeated cell id. */
  readonly subLayoutRootByCellId: QuireTableCellSubLayoutRootMap;
  /** Projected repeated table cell fragment. */
  readonly cell: QuireTableCellFragment;
  /** Page occurrence key: the page index, or page and column on multi-column pages. */
  readonly pageIndex: number | string;
}): readonly QuireLayoutBoxSubLayoutFragment[] {
  const suffix = createQuireRepeatedHeaderTablePartSuffix(options.pageIndex);
  const subLayoutRoot = options.subLayoutRootByCellId.get(options.cell.id);
  const sourceChild = subLayoutRoot?.view.sourceBox;

  if (subLayoutRoot === undefined || sourceChild === undefined) {
    return [];
  }

  const contentLayoutRect = resolveQuireTableCellContentLayoutRect(options.cell);
  const sourceContentRect = sourceChild.subLayoutFragments![0]!.subLayout.geometry.root.placement.contentRect;
  // The source wrapper's sub-layout describes the original header occurrence at source coordinates;
  // the repeated occurrence is projected from the cloned children alone.
  const { subLayoutFragments: _sourceOccurrence, ...clone } = cloneQuireLayoutBoxWithOffset({
    box: sourceChild,
    dx: contentLayoutRect.x - sourceContentRect.x,
    dy: contentLayoutRect.y - sourceContentRect.y,
    id: options.cell.id,
    suffix
  });
  const children = [clone as QuireLayoutBox];
  const sourceFlowClip = {
    top: sourceChild.rect.y,
    bottom: sourceChild.rect.y + sourceChild.rect.height
  };
  const sourceChildId = resolveQuireTablePartSourceId(
    options.cell.id,
    options.pageIndex
  );

  return [
    {
      subLayout: createQuireRepeatedHeaderCellSubLayoutProjection({
        root: subLayoutRoot,
        sourceChildId,
        sourceFlowClip,
        sourceRect: sourceChild.rect,
        contentClip: contentLayoutRect,
        children
      })
    }
  ];
}
