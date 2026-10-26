import type {
  EditorUIDragSource,
  EditorUIDragTargetResolution
} from "./types";

/** Active facts required to validate a resolved target. */
export interface NormalizeEditorUIDragTargetActiveFacts<SourcePayload> {
  /** Current retained snapshot version. */
  readonly snapshotVersion: number;
  /** Stable structural drag source. */
  readonly source: EditorUIDragSource<SourcePayload>;
}

/**
 * Enforces source root and snapshot invariants over resolver output.
 *
 * @param target - Resolver output.
 * @param active - Current active session facts.
 * @returns Ready target or normalized explicit rejection.
 */
export function normalizeEditorUIDragTarget<SourcePayload, TargetPayload>(
  target: EditorUIDragTargetResolution<TargetPayload>,
  active: NormalizeEditorUIDragTargetActiveFacts<SourcePayload>
): EditorUIDragTargetResolution<TargetPayload> {
  if (target.status === "rejected") return target;
  if (target.snapshotVersion !== active.snapshotVersion) {
    return { status: "rejected", reason: "stale", snapshotVersion: target.snapshotVersion };
  }
  if (target.identity.rootId !== active.source.selection.snapshot.rootId) {
    return { status: "rejected", reason: "cross-root", snapshotVersion: target.snapshotVersion };
  }
  if (active.source.selection.contains(target.identity)) {
    return {
      status: "rejected",
      reason: "source-contains-target",
      snapshotVersion: target.snapshotVersion
    };
  }
  return target;
}
