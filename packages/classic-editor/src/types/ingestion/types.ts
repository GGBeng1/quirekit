/** Target retained for asynchronous content, image, or attachment insertion. */
export interface ClassicEditorInsertionBookmarkTarget {
  /** Closed target discriminator. */
  readonly kind: "insertion-bookmark";
  /** Editor-runtime bookmark identity, never a naked position. */
  readonly bookmarkId: string;
  /** Story that must still own the mapped insertion point. */
  readonly storyId: string;
  /** Feature owner expected to perform the final command. */
  readonly expectedOwner: string;
}

/** Target retained for asynchronous replacement of a stable document object. */
export interface ClassicEditorNodeTarget {
  /** Closed target discriminator. */
  readonly kind: "node-target";
  /** Stable feature-owned object identity. */
  readonly targetId: string;
  /** Object semantic family. */
  readonly nodeKind: "image" | "attachment";
  /** Feature owner expected to perform the final command. */
  readonly expectedOwner: string;
}

/** Target retained for asynchronous full-document replacement. */
export interface ClassicEditorDocumentTarget {
  /** Closed target discriminator. */
  readonly kind: "document-target";
  /** Stable document identity. */
  readonly documentId: string;
  /** Revision that must still be current at commit. */
  readonly expectedRevision: string;
}

/** Closed semantic target family that never crosses the Host boundary. */
export type ClassicEditorIngestionTarget =
  | ClassicEditorInsertionBookmarkTarget
  | ClassicEditorNodeTarget
  | ClassicEditorDocumentTarget;

/** Immutable target capture issued to one async operation. */
export interface ClassicEditorTargetBookmark {
  /** Source target retained by the editor-aware runtime. */
  readonly target: ClassicEditorIngestionTarget;
  /** Monotonic target generation for late-result rejection. */
  readonly generation: number;
  /** Policy revision to recheck before feature commit. */
  readonly policyRevision: string;
}

/** Recheck facts supplied by a feature controller at ready-to-commit. */
export interface ClassicEditorTargetFreshnessInput {
  /** Current operation remains pending and owned by this controller. */
  readonly operationActive: boolean;
  /** Editor instance remains alive. */
  readonly editorAvailable: boolean;
  /** Feature owner remains installed and matches the captured target. */
  readonly ownerAvailable: boolean;
  /** Required schema capability remains installed. */
  readonly schemaAvailable: boolean;
  /** Current policy revision. */
  readonly policyRevision: string;
  /** Whether the target is outside a protected or locked range. */
  readonly unlocked: boolean;
  /** Whether the principal still holds feature permission. */
  readonly permitted: boolean;
  /** Whether editing remains allowed. */
  readonly editable: boolean;
  /** Current target generation after editor mapping/remap. */
  readonly generation: number;
  /** Re-resolved target identity from the current editor state. */
  readonly resolvedTarget: ClassicEditorIngestionTarget | null;
  /** Re-resolved feature owner identity. */
  readonly resolvedOwner: string | null;
  /** Whether current policy admits execution despite matching revision. */
  readonly policyAllowed: boolean;
}

/** Resolved target outcome before a feature calls its typed `can()` command. */
export interface ClassicEditorTargetFreshnessResult {
  /** Whether final feature command admission may continue. */
  readonly status: "ready" | "stale" | "denied";
  /** Original target when it remains usable. */
  readonly target: ClassicEditorIngestionTarget | null;
  /** Stable outcome explanation. */
  readonly reason: string | null;
}
