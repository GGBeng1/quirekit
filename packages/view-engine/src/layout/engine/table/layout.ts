import {
  layoutQuireTableGeometry,
  type QuireTableCellBlockFlowLayout,
  type QuireTableCellGeometry,
  type QuireTableGeometrySnapshot
} from "@quirekit/layout/table";
import { layoutQuireBlockContainer } from "../block";
import type { QuireLayoutContainer } from "../types";
import type { QuireLayoutBoxSubLayoutFragment } from "../sub-layout";
import { createQuireSinglePageTableCellSubLayoutFragment } from "./sub-layout/result";
import type { QuireBlockLayoutInput } from "../block-types";
import type {
  QuireTableCellFragment,
  QuireTableHitTarget,
  QuireTableLayoutSnapshot,
  QuireTableViewLayoutInput
} from "./types";

/** Layout container for one table cell with retained query products. */
interface QuireSinglePageTableCellLayoutContainer extends QuireLayoutContainer {
  /** Sub-layout fragments retained by snapshot adaptation. */
  readonly subLayoutFragments: readonly QuireLayoutBoxSubLayoutFragment[];
}

/**
 * Adapts neutral table geometry into recursive View layout products.
 *
 * The neutral kernel owns physical table geometry. This adapter owns the exact
 * recursive block inputs, interaction hits, and sub-layout projection required
 * by editor-facing snapshots.
 *
 * @param input - Normalized table input with a recursive View content measurer.
 * @returns View layout container carrying cell children and table products.
 */
export function layoutQuireSinglePageTable(
  input: QuireTableViewLayoutInput
): QuireLayoutContainer {
  const contentByCellId = new Map<
    string,
    QuireTableCellBlockFlowLayout<QuireBlockLayoutInput>
  >();
  const geometry = layoutQuireTableGeometry({
    ...input,
    measureContent: (cell, contentRect) => {
      const content = input.measureContent(cell, contentRect);
      contentByCellId.set(cell.id, content);
      return { height: content.height };
    }
  });
  const cells = geometry.cells.map((cell) => ({
    ...cell,
    contentChildren: contentByCellId.get(cell.semanticCellId)?.children ?? []
  }));
  const hitTargets = cells.map((cell) => createHitTarget(input.tableId, cell));
  const snapshot = createViewSnapshot(
    geometry,
    cells,
    hitTargets,
    input.source.floating
  );
  const children = cells.map((cell) => createCellLayoutBox(input, cell));

  return {
    id: `${input.tableId}:layout`,
    range: input.tableRange,
    rect: geometry.rect,
    children,
    table: snapshot
  };
}

/**
 * Creates the View-owned table snapshot from neutral geometry.
 *
 * @param geometry - Consumer-neutral table geometry.
 * @param cells - Cell geometry extended with recursive View children.
 * @param hitTargets - Editor interaction hits derived from the cells.
 * @param floating - Optional floating placement retained for page projection.
 * @returns View table snapshot consumed by pagination and paint adapters.
 */
function createViewSnapshot(
  geometry: QuireTableGeometrySnapshot,
  cells: readonly QuireTableCellFragment[],
  hitTargets: readonly QuireTableHitTarget[],
  floating: QuireTableLayoutSnapshot["floating"]
): QuireTableLayoutSnapshot {
  return {
    ...geometry,
    fragmentId: geometry.geometryId,
    rows: geometry.rows,
    cells,
    hitTargets,
    ...(floating == null ? {} : { floating })
  };
}

/**
 * Creates an editor interaction hit for one table cell.
 *
 * @param tableId - Stable table identity.
 * @param cell - Cell geometry represented by the hit.
 * @returns Table cell hit target.
 */
function createHitTarget(
  tableId: string,
  cell: QuireTableCellGeometry
): QuireTableHitTarget {
  return {
    id: `${tableId}:hit:${cell.semanticCellId}`,
    kind: "cell",
    tableId,
    semanticCellId: cell.semanticCellId,
    originExplicitCellId: cell.originExplicitCellId,
    explicitCellIds: cell.explicitCellIds,
    originCellPos: cell.originCellPos,
    range: cell.range,
    rect: cell.rect
  };
}

/**
 * Creates a recursive layout container for one table cell.
 *
 * @param input - View table layout input.
 * @param cell - Cell fragment whose recursive content should be laid out.
 * @returns Layout container for the cell content and sub-layout projection.
 */
function createCellLayoutBox(
  input: QuireTableViewLayoutInput,
  cell: QuireTableCellFragment
): QuireSinglePageTableCellLayoutContainer {
  const contentLayout = layoutQuireBlockContainer({
    id: `${cell.id}:content`,
    range: cell.range,
    rect: cell.contentLayoutRect ?? cell.contentRect,
    blockHeight: Math.max(1, cell.contentRect.height),
    blockGap: 0,
    children: cell.contentChildren
  });

  return {
    id: cell.id,
    range: contentLayout.range,
    rect: cell.clipsOverflow ? cell.contentRect : cell.rect,
    subLayoutFragments: [
      createQuireSinglePageTableCellSubLayoutFragment({
        input,
        cell,
        contentLayout
      })
    ],
    children: contentLayout.children
  };
}
