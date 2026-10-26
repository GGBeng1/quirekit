import { createQuireTableBorderCandidates } from "../candidates";
import { partitionQuireTableBorderCandidates } from "./partition";
import { createQuireResolvedTableBorderSegment } from "./segment";
import { resolveQuireTableBorderWinner } from "./winner";
import type {
  QuireResolvedTableBorderSegment,
  QuireTableBorderCandidate,
  QuireTableBorderResolutionOptions
} from "../../types";

/**
 * Resolves table border candidates into deterministic physical paint segments.
 *
 * Candidate collection, atomic interval partitioning, conflict ranking, and
 * segment assembly stay separate so each phase consumes one stable authority.
 * In particular, paint geometry never participates in winner selection.
 *
 * @param options - Border resolution options.
 * @returns Resolved visible border segments.
 */
export function resolveQuireTableBorderSegments(
  options: QuireTableBorderResolutionOptions
): readonly QuireResolvedTableBorderSegment[] {
  const candidates = options.candidates ??
    createQuireTableBorderCandidates(options.snapshot);
  const groups = partitionQuireTableBorderCandidates(candidates);

  return Array.from(groups.values())
    .map(resolveCandidateGroup)
    .filter(isResolvedBorderSegment);
}

/**
 * Resolves one atomic physical-line group.
 *
 * @param candidates - Candidates sharing one atomic physical edge.
 * @returns Resolved segment, or null when every candidate is non-painting.
 */
function resolveCandidateGroup(
  candidates: readonly QuireTableBorderCandidate[]
): QuireResolvedTableBorderSegment | null {
  const winner = resolveQuireTableBorderWinner(candidates);
  return winner === null
    ? null
    : createQuireResolvedTableBorderSegment(winner, candidates);
}

/**
 * Narrows nullable resolver output to visible border segments.
 *
 * @param segment - Resolver output to inspect.
 * @returns True when the output is a visible border segment.
 */
function isResolvedBorderSegment(
  segment: QuireResolvedTableBorderSegment | null
): segment is QuireResolvedTableBorderSegment {
  return segment !== null;
}
