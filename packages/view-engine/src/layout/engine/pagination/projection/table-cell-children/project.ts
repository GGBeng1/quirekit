import type { QuireLayoutBox } from "../../../types";
import type { QuireLayoutBoxSubLayoutFragment } from "../../../sub-layout";
import type { QuireTableLayoutSnapshot } from "../../../table";
import {
  createQuireTableBodyCellSubLayoutFragmentsFromSourceChildren
} from "./body";
import {
  createQuireRepeatedHeaderCellSubLayoutFragmentsFromSourceChildren
} from "./repeated-header";
import type { QuirePageBodyProjection } from "../types";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/** Options for projecting table-cell child layout boxes into one page fragment. */
export interface QuireTableCellChildrenProjectionOptions {
  /** Source table layout children in source-flow coordinates. */
  readonly sourceChildren: readonly QuireLayoutBox[];
  /** Page-local table snapshot whose cells own projected child placement. */
  readonly table: QuireTableLayoutSnapshot;
  /** Page-body projection that produced the table snapshot. */
  readonly projection: QuirePageBodyProjection;
}

/** Complete table-cell child projection result for one page-local table. */
export interface QuireTableCellChildrenPageProjection {
  /** Ordered sub-layout fragments for repeated headers followed by body cells. */
  readonly subLayoutFragments: readonly QuireLayoutBoxSubLayoutFragment[];
}

/**
 * Creates the complete page-local table-cell child projection result.
 *
 * @param options - Source children, projected table snapshot, and owning projection.
 * @returns Ordered sub-layout fragments for the page-local table.
 */
export function createQuireTableCellChildrenPageProjection(
  options: QuireTableCellChildrenProjectionOptions
): QuireTableCellChildrenPageProjection {
  const bodySubLayoutFragments = createQuireTableBodyCellSubLayoutFragmentsFromSourceChildren({
    sourceChildren: options.sourceChildren,
    table: options.table,
    projection: options.projection
  });
  const repeatedHeaderSubLayoutFragments =
    createQuireRepeatedHeaderCellSubLayoutFragmentsFromSourceChildren({
    sourceChildren: options.sourceChildren,
    table: options.table,
    pageIndex: resolveQuireProjectionOccurrence(options.projection)
  });

  return {
    subLayoutFragments: [
      ...repeatedHeaderSubLayoutFragments,
      ...bodySubLayoutFragments
    ]
  };
}
