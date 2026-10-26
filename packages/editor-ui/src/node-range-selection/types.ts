import type {
  EditorUINodeIdentity,
  EditorUINodeOrderFact
} from "../node-identity";

/** Inline writing direction used only to classify visual range direction. */
export type EditorUIWritingDirection = "ltr" | "rtl";

/** Anchor-to-focus direction in canonical document structure order. */
export type EditorUINodeRangeDirection = "forward" | "backward";

/** Immutable structural node-range snapshot. */
export interface EditorUINodeRangeSelectionSnapshot {
  /** Retained snapshot version that supplied occurrence facts. */
  readonly snapshotVersion: number;
  /** Stable root shared by anchor, focus, and members. */
  readonly rootId: string;
  /** Inline writing direction used for visual navigation. */
  readonly writingDirection: EditorUIWritingDirection;
  /** Anchor-to-focus direction in document structure order. */
  readonly direction: EditorUINodeRangeDirection;
  /** Anchor-to-focus direction after applying inline writing direction. */
  readonly visualDirection: EditorUINodeRangeDirection;
  /** Stable anchor identity retained across Shift extension. */
  readonly anchor: EditorUINodeIdentity;
  /** Stable moving-end identity. */
  readonly focus: EditorUINodeIdentity;
  /** Inclusive ordered structural members between anchor and focus. */
  readonly members: readonly EditorUINodeOrderFact[];
}

/** Inputs used to create one structural node range. */
export interface CreateEditorUINodeRangeSelectionOptions {
  /** Snapshot version that supplied ordered node facts. */
  readonly snapshotVersion: number;
  /** Inline writing direction for visual direction classification. */
  readonly writingDirection: EditorUIWritingDirection;
  /** Ordered occurrence facts for the selected root. */
  readonly nodes: readonly EditorUINodeOrderFact[];
  /** Stable anchor identity. */
  readonly anchor: EditorUINodeIdentity;
  /** Stable focus identity. */
  readonly focus: EditorUINodeIdentity;
}

/** Inputs used to extend one range from its stable anchor. */
export interface ExtendEditorUINodeRangeSelectionOptions {
  /** New snapshot version that supplied ordered node facts. */
  readonly snapshotVersion: number;
  /** Ordered occurrence facts for the selected root. */
  readonly nodes: readonly EditorUINodeOrderFact[];
  /** New stable focus identity. */
  readonly focus: EditorUINodeIdentity;
  /** Optional updated writing direction. */
  readonly writingDirection?: EditorUIWritingDirection | undefined;
}

/** Inputs used to remap one range after collaboration changes. */
export interface RemapEditorUINodeRangeSelectionOptions {
  /** New snapshot version that supplied ordered node facts. */
  readonly snapshotVersion: number;
  /** Ordered occurrence facts after the remote change. */
  readonly nodes: readonly EditorUINodeOrderFact[];
  /** Optional updated writing direction. */
  readonly writingDirection?: EditorUIWritingDirection | undefined;
}

/** Stable rejection reasons produced while resolving a structural range. */
export type EditorUINodeRangeSelectionRejection =
  | {
      readonly status: "rejected";
      readonly reason: "invalid-snapshot-version" | "invalid-node-fact";
      readonly snapshotVersion: number;
    }
  | {
      readonly status: "rejected";
      readonly reason: "cross-root";
      readonly snapshotVersion: number;
      readonly anchorRootId: string;
      readonly focusRootId: string;
    }
  | {
      readonly status: "rejected";
      readonly reason: "duplicate-identity" | "identity-unavailable";
      readonly snapshotVersion: number;
      readonly identity: EditorUINodeIdentity;
    }
  | {
      readonly status: "rejected";
      readonly reason: "duplicate-order";
      readonly snapshotVersion: number;
      readonly order: number;
    }
  | {
      readonly status: "rejected";
      readonly reason: "snapshot-regressed";
      readonly snapshotVersion: number;
      readonly previousSnapshotVersion: number;
    };

/** Successful structural range resolution. */
export interface EditorUINodeRangeSelectionReady {
  /** Ready-result discriminator. */
  readonly status: "ready";
  /** Immutable resolved structural range. */
  readonly selection: import("./selection").NodeRangeSelection;
}

/** Result of creating, extending, or remapping a structural range. */
export type EditorUINodeRangeSelectionResult =
  | EditorUINodeRangeSelectionReady
  | EditorUINodeRangeSelectionRejection;
