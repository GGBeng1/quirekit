import type { QuirePageFragment } from "../types";
import type { QuireMeasuredContainer } from "../container";
import {
  createQuirePaginationItemAnchor,
  type QuirePaginationCheckpoint,
  type QuirePaginationPageRecord
} from "../checkpoint";
import type { QuireMeasuredContainerPageDriveOptions } from "./types";

/**
 * Creates one retained page record from authoritative page-driver products.
 *
 * @param options - Current container, page fragment, checkpoints, and end item.
 * @returns Retained page record.
 */
export function createQuirePaginationPageRecord(options: {
  /** Current measured container. */
  readonly container: QuireMeasuredContainer;
  /** Produced page fragment. */
  readonly fragment: QuirePageFragment;
  /** Incoming page checkpoint. */
  readonly start: QuirePaginationCheckpoint;
  /** Outgoing page checkpoint, or null for the terminal page. */
  readonly end: QuirePaginationCheckpoint | null;
  /** Last measured item accepted by the page. */
  readonly endItemIndex: number;
}): QuirePaginationPageRecord {
  const endItem = createQuirePaginationItemAnchor(options.container, options.endItemIndex);

  return {
    fragment: options.fragment,
    start: options.start,
    end: options.end,
    ...(endItem === undefined ? {} : { endItem })
  };
}

/**
 * Commits a complete checkpoint stream when a store is present.
 *
 * @param input - Drive options, records, and convergence diagnostics.
 * @returns Nothing.
 */
export function commitQuirePaginationCheckpointStream(input: {
  /** Original page-drive options. */
  readonly options: QuireMeasuredContainerPageDriveOptions;
  /** Geometry and pagination-policy key. */
  readonly geometryKey: string;
  /** Complete current page stream. */
  readonly records: readonly QuirePaginationPageRecord[];
  /** Number of pages recomputed in this pass. */
  readonly recomputedPages: number;
  /** Number of suffix pages reused after convergence. */
  readonly suffixPagesReused: number;
  /** Whether a previous stream was available for convergence. */
  readonly convergenceAttempted: boolean;
}): void {
  input.options.paginationCheckpointStore?.write({
    container: input.options.container,
    geometryKey: input.geometryKey,
    records: input.records,
    recomputedPages: input.recomputedPages,
    suffixPagesReused: input.suffixPagesReused,
    convergenceAttempted: input.convergenceAttempted
  });
}
