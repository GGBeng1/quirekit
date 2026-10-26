import type { MindMapEditor, MindMapEditorState } from "@quirekit/mind-map-simple";
import type { MindMapDocument, MindMapTemplate, MindMapTemplateId } from "@quirekit/mind-map";
import type { QuireKitTheme } from "@quirekit/ui";
import type { MindEditorPreviewRenderer } from "../../ui/files/types";

/** Explicit file/template consumer, mounted only on demand. */
export interface MindEditorFilesProps {
  /** Owned editor lifetime. */ readonly editor: MindMapEditor;
  /** Current permission and input state. */ readonly state: MindMapEditorState;
  /** Same semantic theme used by the active editor. */ readonly theme: QuireKitTheme;
}

/** Static complete snapshot; a shared queue owns temporary rendering. */
export interface MindEditorTemplatePreviewProps {
  /** Canonical source being considered. */ readonly document: MindMapDocument;
  /** Shared bounded panel renderer. */ readonly renderer: MindEditorPreviewRenderer;
  /** Same semantic theme as the active editor. */ readonly theme: QuireKitTheme;
  /** Selected detail precedes waiting gallery cards, with no parallel renderer. */ readonly priority?: "selection";
}

/** One catalog entry and the exact source applied when selected. */
export interface MindEditorGalleryEntry extends MindMapTemplate {
  /** Immutable portable source. */ readonly document: MindMapDocument;
}

/** Searchable gallery, independent of source application and file reading. */
export interface MindEditorGalleryProps {
  /** Stable original templates. */ readonly templates: readonly MindEditorGalleryEntry[];
  /** Shared snapshot queue. */ readonly renderer: MindEditorPreviewRenderer;
  /** Active host theme. */ readonly theme: QuireKitTheme;
  /** Current reviewed template. */ readonly selected: MindMapTemplateId | null;
  /** Permission/input gate. */ readonly disabled: boolean;
}
