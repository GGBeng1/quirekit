import type { QuireMeasuredContainer } from "../container";
import { compareQuirePaginationCheckpoints } from "./equality";
import {
  hasQuirePaginationContinuationState,
  isQuirePaginationPageRecordAligned,
  translateQuirePaginationPageRecord
} from "./translate";
import type {
  QuirePaginationCheckpoint,
  QuirePaginationCheckpointConvergence,
  QuirePaginationPageRecord
} from "./types";

/**
 * Finds and translates the retained suffix after one converged page boundary.
 *
 * @param options - Current checkpoint, measured container, and previous stream.
 * @returns Translated suffix, or null when the boundary is not equivalent.
 */
export function findQuirePaginationCheckpointConvergence(options: {
  /** Checkpoint produced after the newly recomputed page. */
  readonly checkpoint: QuirePaginationCheckpoint;
  /** Current measured container. */
  readonly container: QuireMeasuredContainer;
  /** Previous complete page stream. */
  readonly previous: readonly QuirePaginationPageRecord[];
}): QuirePaginationCheckpointConvergence | null {
  const previousIndex = options.previous.findIndex((record) =>
    record.end?.pageIndex === options.checkpoint.pageIndex
  );
  if (previousIndex < 0 || previousIndex + 1 >= options.previous.length) {
    return null;
  }

  const previousCheckpoint = options.previous[previousIndex]!.end;
  if (previousCheckpoint === null) {
    return null;
  }

  const delta = compareQuirePaginationCheckpoints(
    previousCheckpoint,
    options.checkpoint
  );
  if (delta === null) {
    return null;
  }

  const previousSuffix = options.previous.slice(previousIndex + 1);
  if (
    hasQuirePaginationContinuationState(previousSuffix) &&
    (delta.range !== 0 || delta.flow !== 0)
  ) {
    return null;
  }

  const suffix = previousSuffix.map((record) =>
    translateQuirePaginationPageRecord(record, delta)
  );
  if (!suffix.every((record) => isQuirePaginationPageRecordAligned(record, options.container))) {
    return null;
  }

  return { delta, suffix };
}
