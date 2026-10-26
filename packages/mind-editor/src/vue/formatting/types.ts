import type { MindMapEditor, MindMapEditorState } from "@quirekit/mind-map-simple";

/** On-demand selected-topic formatting consumer. */
export interface MindEditorFormattingProps {
  /** Active editor lifetime. */ readonly editor: MindMapEditor;
  /** Accepted document invalidation counter. */ readonly version: number;
  /** Small selection and permission state. */ readonly state: MindMapEditorState;
}
