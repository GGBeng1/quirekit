import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type {
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";

import {
  collectQuireSelectionGeometrySourceFragmentIds,
  collectQuireSelectionGeometryVisualInstanceIds,
  resolveQuireSelectionGeometryReferenceRect
} from "../selection-geometry-context";
import type { QuireSelectionGeometryContext } from "../types";

/** Facts used to disambiguate one retained selection geometry candidate. */
export interface QuireSelectionGeometryCandidateFacts {
  /** Document range represented by the candidate rectangle. */
  readonly range: QuireDocumentRange;
  /** Rectangle used for reference-distance fallback matching. */
  readonly rect: QuireRect;
  /** Optional retained owner identity attached to the candidate. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}

/**
 * Selects candidates in one duplicate group that match the active context.
 *
 * @param candidates - Duplicate candidates representing one semantic range.
 * @param selectionContext - Retained selection context.
 * @param readCandidate - Reads comparison facts from a candidate.
 * @returns Context-matched candidates, or an empty list when no context applies.
 */
export function selectQuireSelectionGeometryContextCandidates<T>(
  candidates: readonly T[],
  selectionContext: QuireSelectionGeometryContext,
  readCandidate: (candidate: T) => QuireSelectionGeometryCandidateFacts
): readonly T[] {
  const visualMatches = matchVisualInstanceCandidates(
    candidates,
    selectionContext,
    readCandidate
  );

  if (visualMatches.length > 0) {
    return visualMatches;
  }

  const sourceMatches = matchSourceFragmentCandidates(
    candidates,
    selectionContext,
    readCandidate
  );

  if (sourceMatches.length > 0) {
    return sourceMatches;
  }

  const referenceRect = resolveQuireSelectionGeometryReferenceRect(selectionContext);

  return referenceRect === undefined
    ? []
    : selectNearestCandidateGroup(candidates, referenceRect, readCandidate);
}

/**
 * Checks whether two document ranges overlap.
 *
 * @param first - First document range.
 * @param second - Second document range.
 * @returns Whether both ranges share at least one document position.
 */
export function doQuireSelectionGeometryRangesOverlap(
  first: QuireDocumentRange,
  second: QuireDocumentRange
): boolean {
  return Math.max(first.from, second.from) < Math.min(first.to, second.to);
}

/**
 * Selects candidates that match retained visual-instance ids.
 *
 * @param candidates - Duplicate candidates to inspect.
 * @param selectionContext - Retained selection context.
 * @param readCandidate - Reads comparison facts from a candidate.
 * @returns Matching candidates.
 */
function matchVisualInstanceCandidates<T>(
  candidates: readonly T[],
  selectionContext: QuireSelectionGeometryContext,
  readCandidate: (candidate: T) => QuireSelectionGeometryCandidateFacts
): readonly T[] {
  const visualInstanceIds = collectQuireSelectionGeometryVisualInstanceIds(
    selectionContext
  );

  return visualInstanceIds.length === 0
    ? []
    : candidates.filter((candidate) =>
        visualInstanceIds.includes(
          readCandidate(candidate).queryOwner?.region?.visualInstanceId ?? ""
        )
      );
}

/**
 * Selects candidates that match retained source-fragment ids.
 *
 * @param candidates - Duplicate candidates to inspect.
 * @param selectionContext - Retained selection context.
 * @param readCandidate - Reads comparison facts from a candidate.
 * @returns Matching candidates.
 */
function matchSourceFragmentCandidates<T>(
  candidates: readonly T[],
  selectionContext: QuireSelectionGeometryContext,
  readCandidate: (candidate: T) => QuireSelectionGeometryCandidateFacts
): readonly T[] {
  const sourceFragmentIds = collectQuireSelectionGeometrySourceFragmentIds(
    selectionContext
  );

  return sourceFragmentIds.length === 0
    ? []
    : candidates.filter((candidate) =>
        sourceFragmentIds.includes(
          readCandidate(candidate).queryOwner?.sourceFragmentId ?? ""
        )
      );
}

/**
 * Selects the nearest visual peer group inside one duplicate candidate group.
 *
 * @param candidates - Duplicate candidates representing one semantic range.
 * @param referenceRect - Reference rectangle from the active selection gesture.
 * @param readCandidate - Reads comparison facts from a candidate.
 * @returns Nearest visual peer group.
 */
function selectNearestCandidateGroup<T>(
  candidates: readonly T[],
  referenceRect: QuireRect,
  readCandidate: (candidate: T) => QuireSelectionGeometryCandidateFacts
): readonly T[] {
  const nearestCandidate = candidates.reduce<T | undefined>((nearest, candidate) =>
    nearest === undefined ||
      verticalDistance(readCandidate(candidate).rect, referenceRect) <
        verticalDistance(readCandidate(nearest).rect, referenceRect)
      ? candidate
      : nearest, undefined);
  const nearestOwner = nearestCandidate === undefined
    ? undefined
    : readCandidate(nearestCandidate).queryOwner;

  if (nearestCandidate === undefined) {
    return [];
  }

  const visualInstanceId = nearestOwner?.region?.visualInstanceId;
  const sourceFragmentId = nearestOwner?.sourceFragmentId;
  const matches = candidates.filter((candidate) => {
    const owner = readCandidate(candidate).queryOwner;

    return visualInstanceId !== undefined
      ? owner?.region?.visualInstanceId === visualInstanceId
      : sourceFragmentId !== undefined &&
          owner?.sourceFragmentId === sourceFragmentId;
  });

  return matches.length === 0 ? [nearestCandidate] : matches;
}

/**
 * Measures vertical distance between rectangle centers.
 *
 * @param first - First rectangle.
 * @param second - Second rectangle.
 * @returns Absolute vertical center distance.
 */
function verticalDistance(first: QuireRect, second: QuireRect): number {
  return Math.abs(first.y + first.height / 2 - second.y - second.height / 2);
}
