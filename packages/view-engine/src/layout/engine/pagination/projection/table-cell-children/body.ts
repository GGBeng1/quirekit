import type { QuireLayoutBoxSubLayoutFragment } from "../../../sub-layout";
import type { QuireLayoutBox } from "../../../types";
import type {
  QuireTableCellFragment,
  QuireTableLayoutSnapshot
} from "../../../table";
import {
  createQuireTableCellSubLayoutRootMap
} from "../../../table/sub-layout";
import { projectQuireLayoutBoxToFlowClip } from "../flow-clip-projector";
import { createQuireTableBodyCellSubLayoutProjection } from "./sub-layout-result";
import {
  summarizeQuireTableCellPageSlice,
  type QuireTableCellPageSliceSummary
} from "../table/cell-content";
import {
  resolveQuireTablePartChildSuffix,
  resolveQuireTablePartSourceId
} from "../table/part-ids";
import type { QuirePageBodyProjection } from "../types";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/**
 * Creates page-local sub-layout fragments from source table-cell child flow boxes.
 *
 * @param options - Source children, projected table snapshot, and owning projection.
 * @returns Body cell sub-layout fragments in page-local coordinates.
 */
export function createQuireTableBodyCellSubLayoutFragmentsFromSourceChildren(options: {
  /** Source table layout children in source-flow coordinates. */
  readonly sourceChildren: readonly QuireLayoutBox[];
  /** Page-local table snapshot whose body cells own projected child placement. */
  readonly table: QuireTableLayoutSnapshot;
  /** Page-body projection that produced the table snapshot. */
  readonly projection: QuirePageBodyProjection;
}): readonly QuireLayoutBoxSubLayoutFragment[] {
  const bodyCells = options.table.cells.filter((cell) =>
    cell.isRepeatedHeader !== true
  );
  const cellSliceById = new Map<string, QuireTableCellPageSliceSummary>();
  const subLayoutRootByCellId = createQuireTableCellSubLayoutRootMap({
    cells: bodyCells,
    children: options.sourceChildren,
    parentId: options.table.fragmentId,
    resolveSourceCellId: (cell) => resolveQuireTablePartSourceId(
      cell.id,
      resolveQuireProjectionOccurrence(options.projection)
    ),
    createDependencySignature: ({ cell, childFlowBox }) =>
      createQuireTableBodyCellSubLayoutDependencySignature(
        options.table,
        cell,
        childFlowBox,
        getQuireTableBodyCellPageSlice(
          cell,
          options.projection,
          cellSliceById
        )
      )
  });

  return bodyCells
    .flatMap((cell) => {
      const sourceCellId = resolveQuireTablePartSourceId(
        cell.id,
        resolveQuireProjectionOccurrence(options.projection)
      );
      const subLayoutRoot = subLayoutRootByCellId.get(cell.id);
      const sourceChild = subLayoutRoot?.view.sourceBox;

      if (subLayoutRoot === undefined || sourceChild === undefined) {
        return [];
      }

      const cellSlice = getQuireTableBodyCellPageSlice(
        cell,
        options.projection,
        cellSliceById
      );
      const sourceFlowClip = {
        top: cellSlice.contentSourceFlowY,
        bottom: cellSlice.contentSourceFlowY + cellSlice.contentSourceFlowHeight
      };
      const sourceRectClip = cellSlice.sourceContentRect;
      const children = projectQuireLayoutBoxToFlowClip({
        box: sourceChild,
        projection: options.projection,
        flowClip: sourceFlowClip,
        rectClip: sourceRectClip,
        retainPartialText: cell.clipsOverflow,
        id: cell.id,
        suffix: resolveQuireTablePartChildSuffix(cell.id, sourceCellId)
      });
      const subLayout = createQuireTableBodyCellSubLayoutProjection({
        root: subLayoutRoot,
        sourceChildId: sourceCellId,
        sourceFlowClip,
        sourceRectClip,
        children,
        pageIndex: options.projection.page.pageIndex,
        adapterState: createQuireTableBodyCellAdapterState(cell, cellSlice)
      });

      return children.length === 0
        ? []
        : [{
          subLayout
        }];
    });
}

/**
 * Reads or creates the page-local table-cell slice summary for a body cell.
 *
 * @param cell - Page-local table-cell fragment.
 * @param projection - Page-body projection that owns the cell.
 * @param cellSliceById - Cache keyed by page-local cell id.
 * @returns Page-local table-cell slice summary.
 */
function getQuireTableBodyCellPageSlice(
  cell: QuireTableCellFragment,
  projection: QuirePageBodyProjection,
  cellSliceById: Map<string, QuireTableCellPageSliceSummary>
): QuireTableCellPageSliceSummary {
  const existing = cellSliceById.get(cell.id);

  if (existing !== undefined) {
    return existing;
  }

  const cellSlice = summarizeQuireTableCellPageSlice(cell, projection);
  cellSliceById.set(cell.id, cellSlice);

  return cellSlice;
}

/**
 * Creates the dependency signature for a projected body cell sub-layout root.
 *
 * @param table - Page-local table snapshot that owns the cell fragment.
 * @param cell - Page-local table-cell fragment being projected.
 * @param sourceChild - Source child flow box accepted by the cell fragment.
 * @param cellSlice - Page-local cell slice summary.
 * @returns Dependency signature for the projected sub-layout root.
 */
function createQuireTableBodyCellSubLayoutDependencySignature(
  table: QuireTableLayoutSnapshot,
  cell: QuireTableCellFragment,
  sourceChild: QuireLayoutBox,
  cellSlice: QuireTableCellPageSliceSummary
): string {
  return [
    "table-body-cell",
    table.fragmentId,
    cell.id,
    cell.contentRect.x,
    cell.contentRect.y,
    cell.contentRect.width,
    cell.contentRect.height,
    cellSlice.contentSourceFlowY,
    cellSlice.contentSourceFlowHeight,
    sourceChild.rect.x,
    sourceChild.rect.y,
    sourceChild.rect.width,
    sourceChild.rect.height
  ].join("|");
}

/**
 * Creates opaque table-adapter state retained on generic continuations.
 *
 * @param cell - Page-local table-cell fragment being projected.
 * @param cellSlice - Page-local cell slice summary.
 * @returns Adapter-owned policy facts for generic continuation storage.
 */
function createQuireTableBodyCellAdapterState(
  cell: QuireTableCellFragment,
  cellSlice: QuireTableCellPageSliceSummary
): Readonly<Record<string, unknown>> {
  return {
    projectionKind: "table-body-cell",
    tablePolicy: {
      gridRect: cell.gridRect,
      borders: cell.borders,
      styleBorders: cell.styleBorders ?? null,
      cellMargins: cell.cellMargins,
      shading: cell.shading,
      verticalAlign: cell.verticalAlign ?? null,
      isRepeatedHeader: cell.isRepeatedHeader === true,
      visualClip: cellSlice.visualClip,
      contentClip: cellSlice.contentClip,
      sourceVisualRect: cellSlice.sourceVisualRect,
      sourceContentRect: cellSlice.sourceContentRect
    }
  };
}
