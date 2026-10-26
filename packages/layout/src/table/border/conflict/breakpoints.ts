import {
  areQuireTableBorderCoordinatesClose,
  getQuireTableBorderGeometryEpsilon,
  type QuireTableBorderAxisCandidate
} from "./axis";

/** Atomic interval along one normalized table-border axis. */
export interface QuireTableBorderAxisInterval {
  /** Inclusive interval start along the major axis. */
  readonly start: number;
  /** Inclusive interval end along the major axis. */
  readonly end: number;
}

/**
 * Collects sorted unique endpoints from one collinear candidate group.
 *
 * @param candidates - Axis candidates to inspect.
 * @returns Sorted unique start and end coordinates.
 */
export function collectQuireTableBorderAxisBreakpoints(
  candidates: readonly QuireTableBorderAxisCandidate[]
): readonly number[] {
  const breakpoints: number[] = [];

  for (const candidate of candidates) {
    addUniqueBorderBreakpoint(breakpoints, candidate.start);
    addUniqueBorderBreakpoint(breakpoints, candidate.end);
  }

  return breakpoints.sort((left, right) => left - right);
}

/**
 * Checks whether another endpoint falls inside a candidate span.
 *
 * @param candidate - Candidate span to inspect.
 * @param breakpoints - Endpoints collected for the full axis group.
 * @returns True when this candidate must be split.
 */
export function hasInteriorQuireTableBorderAxisBreakpoint(
  candidate: QuireTableBorderAxisCandidate,
  breakpoints: readonly number[]
): boolean {
  const epsilon = getQuireTableBorderGeometryEpsilon();
  return breakpoints.some((breakpoint) =>
    breakpoint > candidate.start + epsilon &&
    breakpoint < candidate.end - epsilon
  );
}

/**
 * Creates non-empty adjacent intervals from sorted axis endpoints.
 *
 * @param breakpoints - Sorted axis endpoints.
 * @returns Atomic adjacent intervals.
 */
export function createQuireTableBorderAxisIntervals(
  breakpoints: readonly number[]
): readonly QuireTableBorderAxisInterval[] {
  const epsilon = getQuireTableBorderGeometryEpsilon();
  return breakpoints.flatMap((breakpoint, index) => {
    const next = breakpoints[index + 1];
    return next === undefined || next <= breakpoint + epsilon
      ? []
      : [{ start: breakpoint, end: next }];
  });
}

/**
 * Checks whether a candidate fully covers an atomic interval.
 *
 * @param candidate - Candidate span to inspect.
 * @param start - Atomic interval start.
 * @param end - Atomic interval end.
 * @returns True when the candidate contributes to the interval.
 */
export function doesQuireTableBorderAxisCandidateCoverInterval(
  candidate: QuireTableBorderAxisCandidate,
  start: number,
  end: number
): boolean {
  const epsilon = getQuireTableBorderGeometryEpsilon();
  return candidate.start <= start + epsilon && candidate.end >= end - epsilon;
}

/**
 * Adds one breakpoint using border geometry tolerance.
 *
 * @param breakpoints - Mutable breakpoint list.
 * @param coordinate - Coordinate to add.
 * @returns Nothing.
 */
function addUniqueBorderBreakpoint(
  breakpoints: number[],
  coordinate: number
): void {
  if (!breakpoints.some((breakpoint) =>
    areQuireTableBorderCoordinatesClose(breakpoint, coordinate)
  )) {
    breakpoints.push(coordinate);
  }
}
