import type { MindMapEditor, MindMapEditorState } from "@quirekit/mind-map-simple";

/** A lazy visible geometry consumer; source publication is outside this panel. */
export interface MindEditorOverviewProps {
  /** Instance-local navigation contract. */ readonly editor: MindMapEditor;
  /** Small viewport and layout invalidations. */ readonly state: MindMapEditorState;
}
