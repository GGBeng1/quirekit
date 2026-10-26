import type { QuireDocumentPosition } from "@quirekit/renderer";
import { isSameNavigationStory } from "./story";
import { findNearestCandidateOnAdjacentLine } from "./adjacent-line";
import { collectVerticalCaretCandidates } from "./collect";
import { selectCurrentVerticalCaretCandidate } from "./current";
import type { QuireVerticalCaretNavigationOptions } from "../types";

/**
 * Resolves visual-line caret movement from retained and fallback caret candidates.
 *
 * @param options - Snapshot, current document position, direction, and retained context.
 * @returns Nearest document position on the adjacent visual line, or null.
 */
export function resolveQuireVerticalCaretPositionFromCandidates(
  options: QuireVerticalCaretNavigationOptions
): QuireDocumentPosition | null {
  const candidates = collectVerticalCaretCandidates(
    options.snapshot.root.children ?? []
  );
  const currentCandidate = selectCurrentVerticalCaretCandidate(
    candidates,
    options
  );

  if (currentCandidate === null) {
    return null;
  }

  const targetCandidate = findNearestCandidateOnAdjacentLine(
    candidates.filter(candidate => isSameNavigationStory(candidate.storyRegion, currentCandidate.storyRegion)),
    currentCandidate,
    currentCandidate.rect.x,
    options.direction
  );

  return targetCandidate?.position ?? null;
}
