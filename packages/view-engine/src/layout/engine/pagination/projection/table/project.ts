import type {
  QuireTableLayoutSnapshot
} from "../../../table";
import { readQuireRepeatedTableHeaderState } from "../../repeated-table-headers";
import { unionQuireRects } from "../geometry";
import {
  createQuireRepeatedHeaderCells,
  createQuireRepeatedHeaderHitTargets,
  createQuireRepeatedHeaderRows
} from "../repeated-header";
import {
  createQuireProjectionSourceFlowClip,
  createQuireProjectionVisualFlowClip,
  type QuireSourceFlowClip
} from "../source-flow";
import { projectQuireTableBodyToPage } from "../table-body";
import { translateQuireTableLayoutSnapshot } from "../translate";
import type { QuirePageBodyProjection } from "../types";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/** Options for projecting table metadata into one page fragment. */
export interface QuireTableLayoutSnapshotPageProjectionOptions {
  /** Source table snapshot in infinite-flow coordinates. */
  readonly table: QuireTableLayoutSnapshot;
  /** Page-body projection that owns the table fragment. */
  readonly projection: QuirePageBodyProjection;
}

/**
 * Filters and translates table metadata for a single page-local table fragment.
 *
 * @param options - Source table snapshot and owning page projection.
 * @returns Page-local table snapshot, or undefined when the page owns no rows/cells.
 */
export function projectQuireTableLayoutSnapshotToPage(
  options: QuireTableLayoutSnapshotPageProjectionOptions
): QuireTableLayoutSnapshot | undefined {
  const pageRange = options.projection.page.range;
  const bodyFlowClip = createQuirePageBodyFlowClip(options.projection);
  const repeatedHeaderFlowClip = createQuirePageVisualFlowClip(options.projection);
  const repeatedHeader = readQuireRepeatedTableHeaderState(
    options.projection.page.endInfo,
    options.table.tableId
  );
  const body = projectQuireTableBodyToPage({
    table: options.table,
    pageRange,
    flowClip: bodyFlowClip,
    projection: options.projection
  });
  const repeatedRows = createQuireRepeatedHeaderRows({
    rows: options.table.rows,
    repeatedHeader,
    flowClip: repeatedHeaderFlowClip,
    pageIndex: resolveQuireProjectionOccurrence(options.projection)
  });
  const repeatedCells = createQuireRepeatedHeaderCells({
    cells: options.table.cells,
    repeatedHeader,
    rows: options.table.rows,
    flowClip: repeatedHeaderFlowClip,
    pageIndex: resolveQuireProjectionOccurrence(options.projection)
  });
  const rows = [...repeatedRows, ...body.rows];
  const cells = [...repeatedCells, ...body.cells];
  const repeatedSemanticCellIds = new Set(
    repeatedCells.map((cell) => cell.semanticCellId)
  );
  const repeatedHitTargets = createQuireRepeatedHeaderHitTargets({
    hitTargets: options.table.hitTargets,
    repeatedHeader,
    repeatedSemanticCellIds,
    rows: options.table.rows,
    flowClip: repeatedHeaderFlowClip,
    pageIndex: resolveQuireProjectionOccurrence(options.projection)
  });
  const hitTargets = [...repeatedHitTargets, ...body.hitTargets];
  const rect = unionQuireRects([
    ...rows.map((row) => row.rect),
    ...cells.map((cell) => cell.rect)
  ]);

  if (rect === null) {
    return undefined;
  }

  return translateQuireTableLayoutSnapshot(
    {
      ...options.table,
      fragmentId: `${options.table.tableId}#p${resolveQuireProjectionOccurrence(options.projection)}`,
      geometryId: `${options.table.tableId}#p${resolveQuireProjectionOccurrence(options.projection)}`,
      rect,
      rows,
      cells,
      hitTargets
    },
    options.projection
  );
}

/**
 * Source-flow vertical bounds accepted for body rows on one page fragment.
 *
 * @param projection - Page-body projection being applied.
 * @returns Flow-space top and bottom of the accepted body content.
 */
function createQuirePageBodyFlowClip(
  projection: QuirePageBodyProjection
): QuireSourceFlowClip {
  return createQuireProjectionSourceFlowClip(projection);
}

/**
 * Flow-space vertical bounds represented by the page-local visual fragment.
 *
 * Repeated table headers are cloned into the page's reserved visual header band,
 * which sits before the accepted body source-flow band when the page projection
 * includes a repeated-header offset.
 *
 * @param projection - Page-body projection being applied.
 * @returns Flow-space top and bottom of the page visual fragment.
 */
function createQuirePageVisualFlowClip(
  projection: QuirePageBodyProjection
): QuireSourceFlowClip {
  return createQuireProjectionVisualFlowClip(projection);
}
