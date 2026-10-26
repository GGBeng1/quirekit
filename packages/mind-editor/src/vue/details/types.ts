import type { MindEditorDrafts } from "../../runtime/drafts/types";
import type { MindMapEditor, MindMapEditorState } from "@quirekit/mind-map-simple";

/** One explicit insertion request; object identity distinguishes repeated requests. */
export interface MindEditorDetailRequest {
  /** Property that should receive focus or open its file chooser. */
  readonly field: "image" | "link" | "note" | "marker";
}

/** On-demand topic content editor. */
export interface MindEditorDetailsProps {
  /** Owned editor lifetime. */ readonly editor: MindMapEditor;
  /** Workspace-owned pending fields. */ readonly drafts: MindEditorDrafts;
  /** Small draft invalidation counter. */ readonly draftVersion: number;
  /** Accepted source version. */ readonly version: number;
  /** Small selection and permission state. */ readonly state: MindMapEditorState;
  /** Optional field intent from the Insert menu. */ readonly request?: MindEditorDetailRequest | null;
}
