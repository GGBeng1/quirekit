import { createC1QuireTableBorderCandidates } from "./fallback-candidates";
import { createSourceQuireTableBorderCandidates } from "./source-candidates";
import type {
  QuireTableBorderCandidate,
  QuireTableGeometrySnapshot
} from "../types";

/**
 * Creates source-aware candidates, falling back to C1 geometry when needed.
 *
 * @param snapshot - Table snapshot to inspect.
 * @returns Border candidates for the snapshot.
 */
export function createQuireTableBorderCandidates(
  snapshot: QuireTableGeometrySnapshot
): readonly QuireTableBorderCandidate[] {
  return hasSourceBorderMetadata(snapshot)
    ? createSourceQuireTableBorderCandidates(snapshot)
    : createC1QuireTableBorderCandidates(snapshot);
}

/**
 * Checks whether the snapshot carries explicit table or cell border metadata.
 *
 * @param snapshot - Table snapshot to inspect.
 * @returns True when the resolver should use source border candidates.
 */
function hasSourceBorderMetadata(snapshot: QuireTableGeometrySnapshot): boolean {
  return snapshot.borders !== null ||
    snapshot.rows.some((row) => row.borders !== null && row.borders !== undefined) ||
    snapshot.cells.some((cell) => cell.borders !== null || cell.styleBorders != null);
}
