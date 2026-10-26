import type { MindEditorDrafts } from "../../runtime/drafts/types";
import type { MindMapEditor, MindMapEditorState } from "@quirekit/mind-map-simple";

/** On-demand annotation editing consumer. */
export interface MindEditorAnnotationProps {
  /** Owned renderer and command boundary. */ readonly editor: MindMapEditor;
  /** Workspace-owned pending fields. */ readonly drafts: MindEditorDrafts;
  /** Small draft invalidation counter. */ readonly draftVersion: number;
  /** Accepted source version. */ readonly version: number;
  /** Small permission and selection state. */ readonly state: MindMapEditorState;
  /** An explicitly created annotation whose properties should open. */ readonly selectedId?: string | undefined;
}
