import {
  isConcreteQuireTableBorder,
  resolveQuireTableBorderColor,
  resolveQuireTableBorderStylePriority,
  resolveQuireTableBorderWidth
} from "../style";
import type {
  QuireTableBorder,
  QuireTableBorderCandidate
} from "../../types";

/** Conflict winner whose border has passed the concrete-border guard. */
export type QuireConcreteTableBorderCandidate = QuireTableBorderCandidate & {
  /** Visible normalized border selected by conflict resolution. */
  readonly border: QuireTableBorder;
};

/**
 * Resolves the visible winner for one atomic physical border edge.
 *
 * @param candidates - Candidates sharing the same atomic physical line.
 * @returns Winning concrete candidate, or null when no candidate paints.
 */
export function resolveQuireTableBorderWinner(
  candidates: readonly QuireTableBorderCandidate[]
): QuireConcreteTableBorderCandidate | null {
  const edges = groupByEdgeOwner(candidates);
  // Each cell edge settles by authority first; the edges meeting on one line then compete without it.
  const winner = edges === null
    ? [...candidates].sort(compareBorderCandidates)[0]
    : edges.map(edge => [...edge].sort(compareBorderCandidates)[0]!).sort(compareAdjacentCandidates)[0];
  return winner && isConcreteQuireTableBorder(winner.border)
    ? { ...winner, border: winner.border }
    : null;
}

/**
 * Compares candidates in descending normalized border-conflict order.
 *
 * @param left - Left candidate.
 * @param right - Right candidate.
 * @returns Negative when left should win before right.
 */
function compareBorderCandidates(
  left: QuireTableBorderCandidate,
  right: QuireTableBorderCandidate
): number {
  // OOXML direct formatting is an authority tier, not a late tie-breaker.
  // Within one cell edge, table < row < cell resolves before visibility so a
  // direct `nil` edge suppresses the border that edge would inherit.
  const priorityDelta = right.priority - left.priority;
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return compareAdjacentCandidates(left, right);
}

/**
 * Orders the settled edges of adjacent cells on one line: visible over hidden, then wider, then style and color.
 *
 * @param left - First candidate.
 * @param right - Second candidate.
 * @returns Sort order placing the winner first.
 */
function compareAdjacentCandidates(
  left: QuireTableBorderCandidate,
  right: QuireTableBorderCandidate
): number {
  const leftConcrete = isConcreteQuireTableBorder(left.border);
  const rightConcrete = isConcreteQuireTableBorder(right.border);

  if (leftConcrete !== rightConcrete) {
    return leftConcrete ? -1 : 1;
  }

  const widthDelta = resolveCandidateWidth(right) - resolveCandidateWidth(left);
  if (widthDelta !== 0) {
    return widthDelta;
  }

  const styleDelta = resolveCandidateStylePriority(right) -
    resolveCandidateStylePriority(left);
  if (styleDelta !== 0) {
    return styleDelta;
  }

  const colorDelta = resolveCandidateColorPriority(right) -
    resolveCandidateColorPriority(left);
  if (colorDelta !== 0) {
    return colorDelta;
  }

  return left.id.localeCompare(right.id);
}

/**
 * Resolves a candidate width for ordering.
 *
 * @param candidate - Candidate whose width should be resolved.
 * @returns Candidate width in CSS pixels.
 */
function resolveCandidateWidth(candidate: QuireTableBorderCandidate): number {
  return isConcreteQuireTableBorder(candidate.border)
    ? resolveQuireTableBorderWidth(candidate.border)
    : 0;
}

/**
 * Resolves a candidate style priority for ordering.
 *
 * @param candidate - Candidate whose style should be ranked.
 * @returns Deterministic border style priority.
 */
function resolveCandidateStylePriority(
  candidate: QuireTableBorderCandidate
): number {
  return isConcreteQuireTableBorder(candidate.border)
    ? resolveQuireTableBorderStylePriority(candidate.border)
    : 0;
}

/**
 * Resolves a candidate color priority for ordering.
 *
 * @param candidate - Candidate whose color should be ranked.
 * @returns Deterministic numeric color priority.
 */
function resolveCandidateColorPriority(
  candidate: QuireTableBorderCandidate
): number {
  if (!isConcreteQuireTableBorder(candidate.border)) {
    return 0;
  }

  const color = resolveQuireTableBorderColor(candidate.border);
  const hex = color.startsWith("#") ? color.slice(1) : "";

  return /^[0-9a-f]{6}$/iu.test(hex)
    ? Number.parseInt(hex, 16)
    : stableBorderColorHash(color);
}

/**
 * Creates a stable numeric priority for non-hex color tokens.
 *
 * @param color - Resolved color token.
 * @returns Stable positive hash for deterministic ordering.
 */
function stableBorderColorHash(color: string): number {
  let hash = 0;

  for (const character of color) {
    hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

/**
 * Groups candidates by the cell edge they speak for.
 *
 * @param candidates - Candidates on one physical line segment.
 * @returns Candidates per cell edge, or null when any candidate has no edge owner.
 */
function groupByEdgeOwner(
  candidates: readonly QuireTableBorderCandidate[]
): readonly (readonly QuireTableBorderCandidate[])[] | null {
  const groups = new Map<string, QuireTableBorderCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.edgeOwnerId === undefined) return null;
    groups.set(candidate.edgeOwnerId, [...(groups.get(candidate.edgeOwnerId) ?? []), candidate]);
  }
  return [...groups.values()];
}

