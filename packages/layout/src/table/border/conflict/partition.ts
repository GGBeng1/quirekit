import { normalizeQuireTableLineSegment } from "../geometry";
import {
  areQuireTableBorderCoordinatesClose,
  createQuireTableBorderAxisCandidate,
  createQuireTableBorderAxisCandidateKey,
  createQuireTableBorderAxisIntervalLine,
  formatQuireTableBorderCoordinate,
  type QuireTableBorderAxisCandidate
} from "./axis";
import {
  collectQuireTableBorderAxisBreakpoints,
  createQuireTableBorderAxisIntervals,
  doesQuireTableBorderAxisCandidateCoverInterval,
  hasInteriorQuireTableBorderAxisBreakpoint
} from "./breakpoints";
import type { QuireTableBorderCandidate } from "../../types";

/**
 * Partitions overlapping candidates into atomic physical-line groups.
 *
 * @param candidates - Border candidates collected from table, row, and cell sources.
 * @returns Candidate groups keyed by one atomic normalized physical line.
 */
export function partitionQuireTableBorderCandidates(
  candidates: readonly QuireTableBorderCandidate[]
): ReadonlyMap<string, readonly QuireTableBorderCandidate[]> {
  const grouped = new Map<string, QuireTableBorderCandidate[]>();

  for (const candidate of splitBorderCandidatesAtSharedAxisBreaks(candidates)) {
    const key = createBorderCandidateKey(candidate);
    const group = grouped.get(key);

    if (group) {
      group.push(candidate);
    }
    else {
      grouped.set(key, [candidate]);
    }
  }

  return grouped;
}

/**
 * Splits collinear candidates at every shared endpoint.
 *
 * @param candidates - Border candidates before interval partitioning.
 * @returns Candidates clipped to atomic shared-edge spans.
 */
function splitBorderCandidatesAtSharedAxisBreaks(
  candidates: readonly QuireTableBorderCandidate[]
): readonly QuireTableBorderCandidate[] {
  const axisGroups = new Map<string, QuireTableBorderAxisCandidate[]>();

  candidates.forEach((candidate, order) => {
    const axisCandidate = createQuireTableBorderAxisCandidate(candidate, order);
    const key = createQuireTableBorderAxisCandidateKey(axisCandidate);
    const group = axisGroups.get(key);

    if (group) {
      group.push(axisCandidate);
    }
    else {
      axisGroups.set(key, [axisCandidate]);
    }
  });

  return Array.from(axisGroups.values())
    .sort((left, right) => left[0]!.order - right[0]!.order)
    .flatMap(splitBorderAxisCandidateGroup);
}

/**
 * Splits one collinear group when a candidate spans another endpoint.
 *
 * @param candidates - Collinear candidate group.
 * @returns Original or atomically split candidates for the axis.
 */
function splitBorderAxisCandidateGroup(
  candidates: readonly QuireTableBorderAxisCandidate[]
): readonly QuireTableBorderCandidate[] {
  const breakpoints = collectQuireTableBorderAxisBreakpoints(candidates);
  const needsSplit = candidates.some((candidate) =>
    hasInteriorQuireTableBorderAxisBreakpoint(candidate, breakpoints)
  );

  if (!needsSplit) {
    return [...candidates]
      .sort((left, right) => left.order - right.order)
      .map((candidate) => ({
        ...candidate.candidate,
        line: candidate.line
      }));
  }

  return createQuireTableBorderAxisIntervals(breakpoints).flatMap(({ start, end }) =>
    candidates
      .filter((candidate) => doesQuireTableBorderAxisCandidateCoverInterval(
        candidate,
        start,
        end
      ))
      .sort((left, right) => left.order - right.order)
      .map((candidate) => createSplitBorderCandidate(candidate, start, end))
  );
}

/**
 * Creates a candidate clipped to one atomic interval.
 *
 * @param candidate - Source candidate metadata.
 * @param start - Atomic interval start.
 * @param end - Atomic interval end.
 * @returns Candidate carrying interval-local line coordinates.
 */
function createSplitBorderCandidate(
  candidate: QuireTableBorderAxisCandidate,
  start: number,
  end: number
): QuireTableBorderCandidate {
  const isOriginalInterval =
    areQuireTableBorderCoordinatesClose(start, candidate.start) &&
    areQuireTableBorderCoordinatesClose(end, candidate.end);

  return {
    ...candidate.candidate,
    id: isOriginalInterval
      ? candidate.candidate.id
      : `${candidate.candidate.id}#${formatQuireTableBorderCoordinate(start)}-${
        formatQuireTableBorderCoordinate(end)
      }`,
    line: createQuireTableBorderAxisIntervalLine(candidate, start, end)
  };
}

/**
 * Creates a stable grouping key for one atomic physical line.
 *
 * @param candidate - Border candidate to key.
 * @returns Stable normalized physical-line key.
 */
function createBorderCandidateKey(candidate: QuireTableBorderCandidate): string {
  const line = normalizeQuireTableLineSegment(candidate.line);
  return [line.from.x, line.from.y, line.to.x, line.to.y].join(":");
}
