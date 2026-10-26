import type { QuireSelectionGeometryContext } from "../types";
import {
  doQuireSelectionGeometryRangesOverlap,
  selectQuireSelectionGeometryContextCandidates
} from "./geometry-context-match";
import type { QuireSelectionGeometryCandidateFacts } from "./geometry-context-match";

/**
 * Filters duplicated selection candidates with the active visual context.
 *
 * @param candidates - Candidate rectangles to filter.
 * @param selectionContext - Optional retained selection context.
 * @param readCandidate - Reads comparison facts from a candidate.
 * @returns Candidates with duplicated source/range alternatives narrowed.
 */
export function filterQuireSelectionGeometryDuplicateCandidatesByContext<T>(
  candidates: readonly T[],
  selectionContext: QuireSelectionGeometryContext | undefined,
  readCandidate: (candidate: T) => QuireSelectionGeometryCandidateFacts
): readonly T[] {
  if (selectionContext === undefined || candidates.length < 2) {
    return candidates;
  }

  const excludedCandidates = new Set<T>();

  for (const group of groupDuplicateCandidates(candidates, readCandidate).values()) {
    const retainedCandidates = selectQuireSelectionGeometryContextCandidates(
      group,
      selectionContext,
      readCandidate
    );

    if (retainedCandidates.length === 0) {
      continue;
    }

    for (const candidate of group) {
      if (!retainedCandidates.includes(candidate)) {
        excludedCandidates.add(candidate);
      }
    }
  }

  const duplicateFilteredCandidates = excludedCandidates.size === 0
    ? candidates
    : candidates.filter((candidate) => !excludedCandidates.has(candidate));

  return filterAnonymousFallbackCandidates(
    duplicateFilteredCandidates,
    readCandidate
  );
}

/**
 * Groups candidates by semantic source root and document range.
 *
 * @param candidates - Candidate rectangles to group.
 * @param readCandidate - Reads comparison facts from a candidate.
 * @returns Duplicate candidate groups.
 */
function groupDuplicateCandidates<T>(
  candidates: readonly T[],
  readCandidate: (candidate: T) => QuireSelectionGeometryCandidateFacts
): ReadonlyMap<string, readonly T[]> {
  const groups = new Map<string, T[]>();

  for (const candidate of candidates) {
    const facts = readCandidate(candidate);
    const sourceRootId = facts.queryOwner?.sourceRootId;

    if (sourceRootId === undefined) {
      continue;
    }

    const key = `${sourceRootId}\u0000${facts.range.from}\u0000${facts.range.to}`;
    const group = groups.get(key);

    if (group === undefined) {
      groups.set(key, [candidate]);
      continue;
    }

    group.push(candidate);
  }

  for (const [key, group] of groups) {
    if (group.length < 2) {
      groups.delete(key);
    }
  }

  return groups;
}

/**
 * Removes anonymous fallback rectangles covered by retained owner candidates.
 *
 * @param candidates - Duplicate-filtered candidates to inspect.
 * @param readCandidate - Reads comparison facts from a candidate.
 * @returns Candidates without anonymous owner-overlap fallbacks.
 */
function filterAnonymousFallbackCandidates<T>(
  candidates: readonly T[],
  readCandidate: (candidate: T) => QuireSelectionGeometryCandidateFacts
): readonly T[] {
  const ownerCandidates = candidates.filter(
    (candidate) => readCandidate(candidate).queryOwner !== undefined
  );

  if (ownerCandidates.length === 0) {
    return candidates;
  }

  return candidates.filter((candidate) => {
    const facts = readCandidate(candidate);

    return facts.queryOwner !== undefined ||
      !ownerCandidates.some((ownerCandidate) =>
        doQuireSelectionGeometryRangesOverlap(
          facts.range,
          readCandidate(ownerCandidate).range
        )
      );
  });
}
