import type {
  ClassicEditorIngestionTarget,
  ClassicEditorTargetBookmark,
  ClassicEditorTargetFreshnessInput,
  ClassicEditorTargetFreshnessResult
} from "../../types/ingestion";

/** Editor-aware target registry that owns async target generations and invalidation. */
export class ClassicEditorTargetFreshnessRegistry {
  private generation = 0;
  private readonly invalidated = new Set<string>();

  /**
   * Captures a target for one async operation without exposing a document position.
   *
   * @param target - Semantic target supplied by the feature owner.
   * @param policyRevision - Policy revision that must still match at commit.
   * @returns Immutable target bookmark.
   */
  capture(target: ClassicEditorIngestionTarget, policyRevision: string): ClassicEditorTargetBookmark {
    this.generation += 1;
    return Object.freeze({ target: Object.freeze({ ...target }), generation: this.generation, policyRevision });
  }

  /**
   * Marks a deleted or ownership-invalid target stale for subsequent rechecks.
   *
   * @param target - Target whose identity no longer resolves.
   */
  invalidate(target: ClassicEditorIngestionTarget): void {
    this.invalidated.add(targetKey(target));
    this.generation += 1;
  }

  /**
   * Advances target generation after an editor-aware bookmark remap.
   *
   * @returns Current mapped target generation.
   */
  remap(): number { this.generation += 1; return this.generation; }

  /**
   * Resolves one retained target against current feature and policy facts.
   *
   * @param bookmark - Retained target bookmark.
   * @param input - Current feature admission facts.
   * @returns Ready, stale, or denied outcome without a caret fallback.
   */
  recheck(
    bookmark: ClassicEditorTargetBookmark,
    input: ClassicEditorTargetFreshnessInput
  ): ClassicEditorTargetFreshnessResult {
    if (!input.operationActive) return result("stale", null, "operation-inactive");
    if (!input.editorAvailable) return result("stale", null, "editor-destroyed");
    if (input.generation < bookmark.generation || this.invalidated.has(targetKey(bookmark.target)) || !sameTarget(bookmark.target, input.resolvedTarget)) {
      return result("stale", null, "target-unavailable");
    }
    if (!input.ownerAvailable || ("expectedOwner" in bookmark.target && input.resolvedOwner !== bookmark.target.expectedOwner)) return result("stale", null, "owner-unavailable");
    if (!input.schemaAvailable) return result("stale", null, "schema-unavailable");
    if (bookmark.policyRevision !== input.policyRevision) return result("denied", null, "policy-revision-changed");
    if (!input.policyAllowed) return result("denied", null, "policy-denied");
    if (!input.unlocked) return result("denied", null, "target-locked");
    if (!input.permitted) return result("denied", null, "permission-denied");
    if (!input.editable) return result("denied", null, "not-editable");
    return result("ready", bookmark.target, null);
  }
}

/** @param status - Freshness status. @param target - Resolved target. @param reason - Stable reason. @returns Frozen outcome. */
function result(
  status: ClassicEditorTargetFreshnessResult["status"],
  target: ClassicEditorIngestionTarget | null,
  reason: string | null
): ClassicEditorTargetFreshnessResult {
  return Object.freeze({ status, target, reason });
}

/** @param target - Semantic target. @returns Stable runtime-only invalidation key. */
function targetKey(target: ClassicEditorIngestionTarget): string {
  return target.kind === "insertion-bookmark" ? `bookmark:${target.bookmarkId}`
    : target.kind === "node-target" ? `node:${target.targetId}`
      : `document:${target.documentId}`;
}

/** @param expected - Captured target. @param resolved - Current resolved target. @returns Exact semantic identity match. */
function sameTarget(expected: ClassicEditorIngestionTarget, resolved: ClassicEditorIngestionTarget | null): boolean {
  if (resolved === null || expected.kind !== resolved.kind) return false;
  if (expected.kind === "insertion-bookmark" && resolved.kind === "insertion-bookmark") return expected.bookmarkId === resolved.bookmarkId && expected.storyId === resolved.storyId;
  if (expected.kind === "node-target" && resolved.kind === "node-target") return expected.targetId === resolved.targetId && expected.nodeKind === resolved.nodeKind;
  return expected.kind === "document-target" && resolved.kind === "document-target" && expected.documentId === resolved.documentId && expected.expectedRevision === resolved.expectedRevision;
}
