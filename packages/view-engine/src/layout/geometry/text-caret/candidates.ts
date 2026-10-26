import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireTextCaretAnchorBoundary, QuireTextCaretAnchorCandidate, QuireTextCaretAnchorCandidateOptions } from "./types";

/**
 * Resolves exact or owner-local adjacent caret geometry in one bounded scan.
 * @param options - Owner range, fragments, position, affinity and clipping.
 * @returns Preferred editable candidate, or null at an unrelated boundary.
 */
export function resolveQuireTextCaretAnchorCandidate(
  options: QuireTextCaretAnchorCandidateOptions
): QuireTextCaretAnchorCandidate | null {
  const { position, side } = options;
  const preferredBoundary = side < 0 ? "end" : "start";
  let direct: QuireTextFragment | undefined;
  let preceding: QuireTextFragment | undefined;
  let following: QuireTextFragment | undefined;

  // Exact stops keep fragment order and wrap/BiDi affinity. Generated markers
  // with no editable stops never become candidates or owner-local neighbors.
  for (const fragment of options.fragments) {
    if (fragment.caretStops.length === 0) continue;
    if (position >= fragment.range.from && position <= fragment.range.to) {
      if (resolveTextCaretAnchorBoundary(fragment, position) === preferredBoundary) {
        return createCandidate(fragment, options);
      }
      if (direct === undefined || side >= 0) direct = fragment;
    } else if (fragment.range.to < position && (!preceding || fragment.range.to > preceding.range.to)) {
      preceding = fragment;
    } else if (fragment.range.from > position && (!following || fragment.range.from < following.range.from)) {
      following = fragment;
    }
  }
  if (direct) return createCandidate(direct, options);

  // Only a strict interior gap borrows a stop from this owner. Shell boundaries
  // remain structural and cannot acquire geometry from a neighboring paragraph.
  if (position <= options.ownerRange.from || position >= options.ownerRange.to) return null;
  const adjacent = side < 0 ? preceding ?? following : following ?? preceding;
  return adjacent ? createCandidate(adjacent, options) : null;
}

/**
 * Carries owner clipping with one selected editable fragment.
 * @param fragment - Exact or logically adjacent fragment.
 * @param options - Original request whose PM position remains authoritative.
 * @returns Classified candidate without changing the fragment range.
 */
function createCandidate(fragment: QuireTextFragment, options: QuireTextCaretAnchorCandidateOptions): QuireTextCaretAnchorCandidate {
  return { fragment, visibleRect: options.visibleRect, boundary: resolveTextCaretAnchorBoundary(fragment, options.position) };
}

/**
 * Classifies a fragment boundary, including an owner-local unpainted gap.
 * @param fragment - Text fragment being classified.
 * @param position - Requested source position.
 * @returns Boundary role within the fragment.
 */
function resolveTextCaretAnchorBoundary(fragment: QuireTextFragment, position: number): QuireTextCaretAnchorBoundary {
  if (position <= fragment.range.from) return "start";
  return position >= fragment.range.to ? "end" : "inside";
}
