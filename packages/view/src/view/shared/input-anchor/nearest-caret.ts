import type { QuirePoint } from "@quirekit/renderer";
import {
  createQuireInteractionGeometryAuthority,
  type QuireInteractionNearestCaretAtPointResult,
  type QuireRetainedLayoutSnapshot
} from "@quirekit/view-engine";

/**
 * Resolves one retained nearest caret through the canonical shared geometry owner.
 *
 * @param snapshot - Accepted retained layout snapshot.
 * @param point - Document-space point to query.
 * @returns Canonical nearest-caret result with retained ownership facts.
 */
export function resolveMountedNearestCaret(
  snapshot: QuireRetainedLayoutSnapshot,
  point: QuirePoint
): QuireInteractionNearestCaretAtPointResult {
  return createQuireInteractionGeometryAuthority({ snapshot }).nearestCaret(point);
}
