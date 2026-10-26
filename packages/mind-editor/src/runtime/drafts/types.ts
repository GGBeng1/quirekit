import type { MindMapAnnotation, MindMapContentUpdate, MindMapDetailsPatch } from "@quirekit/mind-map";

/** Workspace-owned drafts, independent of panel mounting and live selection. */
export interface MindEditorDrafts {
  /** Restore bounded local fields without applying unfinished values to source. */
  readonly hydrate: (update: MindMapContentUpdate) => void;
  /** Queue explicit fields against captured topic identities. */
  readonly details: (ids: readonly string[], patch: MindMapDetailsPatch) => void;
  /** Read only pending fields for one topic. */
  readonly readDetails: (id: string) => MindMapDetailsPatch;
  /** Queue a complete annotation captured by identity. */
  readonly annotation: (value: MindMapAnnotation) => void;
  /** Read one pending annotation, without inspecting the source tree. */
  readonly readAnnotation: (id: string) => MindMapAnnotation | undefined;
  /** Read detached patches only for an explicit clipboard/save boundary. */
  readonly snapshot: () => MindMapContentUpdate;
  /** Publish one snapshot batch, retaining newer edits and failed values. */
  readonly flush: () => Promise<void>;
  /** Drain all drafts before returning a complete saved source. */
  readonly settled: () => Promise<void>;
  /** Whether any captured fields remain pending. */
  readonly pending: () => boolean;
}

/** Atomic runtime writer used only at apply/leave/save boundaries. */
export type MindEditorDraftWriter = (update: MindMapContentUpdate) => Promise<void>;
