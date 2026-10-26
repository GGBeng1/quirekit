import type { QuireDocumentPosition } from "@quirekit/renderer";

/** Candidate that exposes a document position with bias metadata. */
export interface QuireSubLayoutPositionAffinityCandidate {
  /** Document position represented by this candidate. */
  readonly position: QuireDocumentPosition;
}

/**
 * Selects one candidate for an ambiguous retained sub-layout position.
 *
 * Wrapped visual lines can expose the same document position twice: once as the
 * previous line's trailing edge (`bias: -1`) and once as the next line's leading
 * edge (`bias: 1`). The mounted view's collapsed selection stores only the
 * numeric ProseMirror position, so retained sub-layout queries need the same
 * DOM-like side preference that normal text caret geometry already uses.
 *
 * @param candidates - Matching candidates in layout order.
 * @param side - Side preference for ambiguous wrapped positions.
 * @returns Preferred candidate, or null when no candidate matched.
 */
export function selectQuireSubLayoutPositionAffinityCandidate<
  T extends QuireSubLayoutPositionAffinityCandidate
>(
  candidates: readonly T[],
  side: number
): T | null {
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0] ?? null;
  }

  const preferredBias = side < 0 ? -1 : 1;
  const preferred = candidates.find(
    (candidate) => (candidate.position.bias ?? 0) === preferredBias
  );

  if (preferred) {
    return preferred;
  }

  return side < 0 ? candidates[0] ?? null : candidates.at(-1) ?? null;
}
