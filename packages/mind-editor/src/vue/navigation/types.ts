import type { MindMapEditor, MindMapEditorState } from "@quirekit/mind-map-simple";

/** Inputs observed only while the navigation panel is mounted. */
export interface MindEditorNavigationProps {
  /** Current instance; an explicitly replaced source creates a new one. */ readonly editor: MindMapEditor;
  /** Source invalidation counter, independent of selection and viewport. */ readonly version: number;
  /** Small permission, composition and selection projection. */ readonly state: MindMapEditorState;
}
