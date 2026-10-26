import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../types";
import type { QuireTableLayoutSnapshot } from "../../../table";
import {
  createQuireTableCellChildrenPageProjection
} from "../table-cell-children";
import { projectQuireTableLayoutSnapshotToPage } from "../table";
import { unionQuireTableFragmentRange } from "./union";
import type { QuirePageBodyProjection } from "../types";
import { projectQuireLayoutBoxViewProductsToPage } from "./visual-instance";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/** Options for splitting a table layout container across page fragments. */
export interface QuireTableLayoutContainerSplitOptions {
  /** Source table layout container in flow coordinates. */
  readonly box: QuireLayoutContainer;
  /** Source table snapshot in flow coordinates. */
  readonly sourceTable: QuireTableLayoutSnapshot;
  /** Available page-body projections. */
  readonly projections: readonly QuirePageBodyProjection[];
}

/** Page-local table container with recursive cell child fragment provenance. */
export type QuireSplitTableLayoutContainer = QuireLayoutContainer;

/**
 * Splits a table layout container using page-local table cell geometry.
 *
 * Table child content can visually continue into a later row/page even when its
 * semantic range belongs to the merge origin cell. The table snapshot already
 * knows which cells are present on each page, so it must drive body child
 * projection instead of the generic range bucket.
 *
 * @param options - Table container, table snapshot, and page projections.
 * @returns One table layout box per page-local table fragment.
 */
export function splitQuireTableLayoutContainerAcrossPages(
  options: QuireTableLayoutContainerSplitOptions
): readonly QuireLayoutBox[] {
  const containers: QuireLayoutBox[] = [];
  for (let index = 0; index < options.projections.length; index += 1) {
    const projection = options.projections[index]!;
    const table = projectQuireTableLayoutSnapshotToPage({
      table: options.sourceTable,
      projection
    });

    if (table === undefined) {
      continue;
    }

    const childProjection = createQuireTableCellChildrenPageProjection({
      sourceChildren: options.box.children,
      table,
      projection
    });
    const subLayoutFragments = childProjection.subLayoutFragments;
    const range = unionQuireTableFragmentRange(table);
    const rect = table.rect;
    const container: QuireSplitTableLayoutContainer = {
      ...options.box,
      id: `${options.box.id}#p${resolveQuireProjectionOccurrence(projection)}`,
      range,
      rect,
      ...projectQuireLayoutBoxViewProductsToPage(
        options.box,
        resolveQuireProjectionOccurrence(projection),
        rect
      ),
      table,
      ...(subLayoutFragments.length === 0
        ? {}
        : { subLayoutFragments }),
      children: []
    };

    containers.push(container);
  }

  return containers;
}
