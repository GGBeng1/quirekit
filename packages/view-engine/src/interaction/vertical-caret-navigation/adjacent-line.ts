import type { QuireVerticalCaretNavigationOptions } from "../types";
import type { QuireVerticalCaretCandidate } from "./types";

/** Coordinate tolerance for grouping projected candidates onto one baseline. */
const visualLineBaselineTolerance = 0.1;

/**
 * Finds the nearest caret above or below the current visual line.
 *
 * @param candidates - Candidate caret stops.
 * @param currentCandidate - Candidate that owns the current caret.
 * @param targetX - Desired horizontal caret coordinate.
 * @param direction - Requested vertical movement direction.
 * @returns Nearest candidate on the requested side, or null.
 */
export function findNearestCandidateOnAdjacentLine(
  candidates: readonly QuireVerticalCaretCandidate[],
  currentCandidate: QuireVerticalCaretCandidate,
  targetX: number,
  direction: QuireVerticalCaretNavigationOptions["direction"]
): QuireVerticalCaretCandidate | null {
  const targetBaseline = findAdjacentLineBaseline(
    candidates,
    currentCandidate.lineBaseline,
    direction
  );

  if (targetBaseline === null) {
    return null;
  }

  let nearest: QuireVerticalCaretCandidate | null = null;
  let nearestHorizontalDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!areBaselinesOnSameLine(candidate.lineBaseline, targetBaseline)) {
      continue;
    }

    const clampedX = Math.min(
      Math.max(targetX, candidate.rect.x),
      candidate.rect.x + candidate.rect.width
    );
    const horizontalDistance = Math.abs(clampedX - targetX);

    if (horizontalDistance < nearestHorizontalDistance) {
      nearest = candidate;
      nearestHorizontalDistance = horizontalDistance;
    }
  }

  return nearest;
}

/**
 * Finds the closest distinct line baseline in the requested direction.
 *
 * Vertical line choice is completed before horizontal affinity is considered,
 * preserving exactly one visual-line step even when sibling run rectangles
 * expose different ascent and descent.
 *
 * @param candidates - Candidate caret stops to inspect.
 * @param currentBaseline - Shared baseline of the current visual line.
 * @param direction - Requested vertical movement direction.
 * @returns Adjacent baseline, or null when the requested side has no line.
 */
function findAdjacentLineBaseline(
  candidates: readonly QuireVerticalCaretCandidate[],
  currentBaseline: number,
  direction: QuireVerticalCaretNavigationOptions["direction"]
): number | null {
  let nearestBaseline: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const verticalDelta = candidate.lineBaseline - currentBaseline;

    if (
      Math.abs(verticalDelta) <= visualLineBaselineTolerance
      || (direction === "up" ? verticalDelta > 0 : verticalDelta < 0)
    ) {
      continue;
    }

    const distance = Math.abs(verticalDelta);

    if (distance < nearestDistance) {
      nearestBaseline = candidate.lineBaseline;
      nearestDistance = distance;
    }
  }

  return nearestBaseline;
}

/**
 * Reports whether two projected baselines identify the same visual line.
 *
 * @param first - First document-space baseline.
 * @param second - Second document-space baseline.
 * @returns Whether the coordinates belong to one visual line.
 */
function areBaselinesOnSameLine(first: number, second: number): boolean {
  return Math.abs(first - second) <= visualLineBaselineTolerance;
}
