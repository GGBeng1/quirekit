import type {
  QuireDocumentRange
} from "@quirekit/renderer";
import type {
  QuireTableCellFragment,
  QuireTableHitTarget,
  QuireTableLayoutSnapshot,
  QuireTableRowFragment
} from "../../../table";
import type { QuireSourceFlowClip } from "../source-flow";
import type { QuirePageBodyProjection } from "../types";
import { projectQuireTableBodyCellsToPage } from "./cells";
import { projectQuireTableBodyHitTargetsToPage } from "./hit-targets";
import { projectQuireTableBodyRowsToPage } from "./rows";

/** Options for projecting normal table body geometry into one page. */
export interface QuireTableBodyPageProjectionOptions {
  /** Source table snapshot in infinite-flow coordinates. */
  readonly table: QuireTableLayoutSnapshot;
  /** Page document range represented by the page fragment. */
  readonly pageRange: QuireDocumentRange;
  /** Source-flow band accepted by the page body. */
  readonly flowClip: QuireSourceFlowClip;
  /** Page-body projection used to suffix split ids. */
  readonly projection: QuirePageBodyProjection;
}

/** Body-only table projection result before final page translation. */
export interface QuireTableBodyPageProjection {
  /** Page-owned table body row fragments. */
  readonly rows: readonly QuireTableRowFragment[];
  /** Page-owned table body cell fragments. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Page-owned table body hit targets. */
  readonly hitTargets: readonly QuireTableHitTarget[];
}

/**
 * Projects normal table body rows, cells, and hit targets into one page band.
 *
 * Repeated headers are intentionally excluded from this module so the body
 * continuation path can evolve toward recursive cell fragments without sharing
 * state with visual header clones.
 *
 * @param options - Source table, page range, body flow clip, and projection.
 * @returns Body rows, cells, and hit targets in source-flow page-local space.
 */
export function projectQuireTableBodyToPage(
  options: QuireTableBodyPageProjectionOptions
): QuireTableBodyPageProjection {
  const rows = projectQuireTableBodyRowsToPage({
    rows: options.table.rows,
    pageRange: options.pageRange,
    flowClip: options.flowClip,
    projection: options.projection
  });
  const cells = projectQuireTableBodyCellsToPage({
    cells: options.table.cells,
    rows,
    pageRange: options.pageRange,
    flowClip: options.flowClip,
    projection: options.projection
  });
  const hitTargets = projectQuireTableBodyHitTargetsToPage({
    hitTargets: options.table.hitTargets,
    cells,
    pageRange: options.pageRange,
    flowClip: options.flowClip,
    projection: options.projection
  });

  return { rows, cells, hitTargets };
}
