import { editorUINodeIdentitiesEqual } from "../node-identity";
import { resolveEditorUINodeRangeSelectionSnapshot } from "./resolve";
import type {
  CreateEditorUINodeRangeSelectionOptions,
  EditorUINodeRangeSelectionResult,
  EditorUINodeRangeSelectionSnapshot,
  ExtendEditorUINodeRangeSelectionOptions,
  RemapEditorUINodeRangeSelectionOptions
} from "./types";

/** Immutable stable-identity selection spanning one structural node range. */
export class NodeRangeSelection {
  /** Immutable version-bound selection facts. */
  readonly snapshot: EditorUINodeRangeSelectionSnapshot;

  /**
   * Creates one immutable range from already validated snapshot facts.
   *
   * @param snapshot - Validated structural range facts.
   */
  private constructor(snapshot: EditorUINodeRangeSelectionSnapshot) {
    this.snapshot = snapshot;
  }

  /**
   * Resolves one structural range from stable identities and ordered facts.
   *
   * @param options - Initial version, direction, identities, and occurrence facts.
   * @returns Ready immutable range or explicit rejection.
   */
  static create(
    options: CreateEditorUINodeRangeSelectionOptions
  ): EditorUINodeRangeSelectionResult {
    return NodeRangeSelection.resolve(options);
  }

  /**
   * Reports whether the immutable range contains one stable identity.
   *
   * @param identity - Stable identity to find.
   * @returns Whether the identity is a current structural member.
   */
  contains(identity: EditorUINodeRangeSelectionSnapshot["anchor"]): boolean {
    return this.snapshot.members.some((member) =>
      editorUINodeIdentitiesEqual(member.identity, identity)
    );
  }

  /**
   * Extends the range from its stable anchor to a new focus.
   *
   * @param options - New snapshot facts and focus identity.
   * @returns Ready extended range or explicit rejection.
   */
  extend(
    options: ExtendEditorUINodeRangeSelectionOptions
  ): EditorUINodeRangeSelectionResult {
    const regression = rejectSnapshotRegression(
      this.snapshot.snapshotVersion,
      options.snapshotVersion
    );
    if (regression !== undefined) return regression;

    return NodeRangeSelection.resolve({
      snapshotVersion: options.snapshotVersion,
      writingDirection: options.writingDirection ?? this.snapshot.writingDirection,
      nodes: options.nodes,
      anchor: this.snapshot.anchor,
      focus: options.focus
    });
  }

  /**
   * Remaps both stable endpoints onto collaboration-updated occurrence facts.
   *
   * @param options - New snapshot facts after a remote change.
   * @returns Ready remapped range or explicit rejection.
   */
  remap(
    options: RemapEditorUINodeRangeSelectionOptions
  ): EditorUINodeRangeSelectionResult {
    const regression = rejectSnapshotRegression(
      this.snapshot.snapshotVersion,
      options.snapshotVersion
    );
    if (regression !== undefined) return regression;

    return NodeRangeSelection.resolve({
      snapshotVersion: options.snapshotVersion,
      writingDirection: options.writingDirection ?? this.snapshot.writingDirection,
      nodes: options.nodes,
      anchor: this.snapshot.anchor,
      focus: this.snapshot.focus
    });
  }

  /**
   * Converts resolved facts into the public ready/rejected result union.
   *
   * @param options - Structural range resolution inputs.
   * @returns Ready immutable selection or resolution rejection.
   */
  private static resolve(
    options: CreateEditorUINodeRangeSelectionOptions
  ): EditorUINodeRangeSelectionResult {
    const resolved = resolveEditorUINodeRangeSelectionSnapshot(options);
    return "status" in resolved
      ? resolved
      : { status: "ready", selection: new NodeRangeSelection(resolved) };
  }
}

/**
 * Rejects a collaboration snapshot that predates the current range.
 *
 * @param previousSnapshotVersion - Current range version.
 * @param snapshotVersion - Candidate next version.
 * @returns Snapshot-regressed rejection, or undefined.
 */
function rejectSnapshotRegression(
  previousSnapshotVersion: number,
  snapshotVersion: number
): Exclude<EditorUINodeRangeSelectionResult, { readonly status: "ready" }> | undefined {
  return snapshotVersion < previousSnapshotVersion
    ? {
        status: "rejected",
        reason: "snapshot-regressed",
        snapshotVersion,
        previousSnapshotVersion
      }
    : undefined;
}
