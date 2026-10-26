import type { QuireRect } from "@quirekit/renderer";
import {
  collectQuireSelectionGeometrySourceFragmentIds,
  collectQuireSelectionGeometryVisualInstanceIds,
  resolveQuireSelectionGeometryReferenceRect
} from "../selection-geometry-context";
import type { QuireVerticalCaretNavigationOptions } from "../types";
import type { QuireVerticalCaretCandidate } from "./types";

/**
 * Selects the current caret candidate for a collapsed navigation request.
 *
 * @param candidates - All retained caret candidates in layout order.
 * @param options - Navigation options with position, side, and retained context.
 * @returns Current candidate, or null when no candidate owns the position.
 */
export function selectCurrentVerticalCaretCandidate(
  candidates: readonly QuireVerticalCaretCandidate[],
  options: QuireVerticalCaretNavigationOptions
): QuireVerticalCaretCandidate | null {
  const positionCandidates = candidates.filter(
    (candidate) => candidate.position.pos === options.position.pos
  );

  if (positionCandidates.length === 0) {
    return null;
  }

  const contextCandidate = selectVerticalCaretCandidateByContext(
    positionCandidates,
    options.selectionContext
  );

  if (contextCandidate !== null) {
    return contextCandidate;
  }

  const side = options.position.bias ?? 0;

  if (side !== 0) {
    const sideCandidate = positionCandidates.find(
      (candidate) => candidate.position.bias === side
    );

    if (sideCandidate !== undefined) {
      return sideCandidate;
    }
  }

  return positionCandidates[0] ?? null;
}

/**
 * Selects a caret candidate by retained visual identity.
 *
 * @param candidates - Candidates at the same document position.
 * @param selectionContext - Optional active selection context.
 * @returns Context-matched candidate, or null when context is absent or ambiguous.
 */
function selectVerticalCaretCandidateByContext(
  candidates: readonly QuireVerticalCaretCandidate[],
  selectionContext: QuireVerticalCaretNavigationOptions["selectionContext"]
): QuireVerticalCaretCandidate | null {
  if (selectionContext === undefined || candidates.length < 2) {
    return null;
  }

  const visualInstanceIds = collectQuireSelectionGeometryVisualInstanceIds(
    selectionContext
  );

  if (visualInstanceIds.length > 0) {
    const match = candidates.find((candidate) =>
      visualInstanceIds.includes(
        candidate.queryOwner?.region?.visualInstanceId ?? ""
      )
    );

    if (match !== undefined) {
      return match;
    }
  }

  const sourceFragmentIds = collectQuireSelectionGeometrySourceFragmentIds(
    selectionContext
  );

  if (sourceFragmentIds.length > 0) {
    const match = candidates.find((candidate) =>
      sourceFragmentIds.includes(candidate.queryOwner?.sourceFragmentId ?? "")
    );

    if (match !== undefined) {
      return match;
    }
  }

  const referenceRect = resolveQuireSelectionGeometryReferenceRect(
    selectionContext
  );

  return referenceRect === undefined
    ? null
    : findNearestCaretCandidateToRect(candidates, referenceRect);
}

/**
 * Finds the nearest candidate to an active retained reference rectangle.
 *
 * @param candidates - Candidate carets at the same document position.
 * @param referenceRect - Retained reference rectangle from the active gesture.
 * @returns Nearest candidate, or null when no candidate exists.
 */
function findNearestCaretCandidateToRect(
  candidates: readonly QuireVerticalCaretCandidate[],
  referenceRect: QuireRect
): QuireVerticalCaretCandidate | null {
  let nearest: QuireVerticalCaretCandidate | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = measureRectCenterDistance(candidate.rect, referenceRect);

    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Measures squared center distance between two rectangles.
 *
 * @param first - First rectangle to compare.
 * @param second - Second rectangle to compare.
 * @returns Squared center distance.
 */
function measureRectCenterDistance(first: QuireRect, second: QuireRect): number {
  const dx = first.x + first.width / 2 - (second.x + second.width / 2);
  const dy = readRectCenterY(first) - readRectCenterY(second);

  return dx * dx + dy * dy;
}

/**
 * Reads a rectangle's vertical center.
 *
 * @param rect - Rectangle to inspect.
 * @returns Vertical center coordinate.
 */
function readRectCenterY(rect: QuireRect): number {
  return rect.y + rect.height / 2;
}
