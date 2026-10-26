import type { BlockEditorInstance } from "../runtime";
import type { Editor } from "@quirekit/core";
import type { BlockFormattingState } from "../ui/state/types";

/** Properties of the reusable Block Editor product surface. */
export interface BlockEditorProps {
  /** Stable document session; the creator retains final destruction ownership. */
  readonly instance: BlockEditorInstance;
  /** Host-owned title, independent of the rich-text document. */
  readonly title: string;
}

/** Toolbar inputs share one precomputed selection projection. */
export interface BlockToolbarProps {
  /** Canonical command target. */
  readonly editor: Editor;
  /** Shared format summary. */
  readonly format: BlockFormattingState;
  /** Current editing policy. */
  readonly editable: boolean;
  /** Undo availability. */
  readonly undo: boolean;
  /** Redo availability. */
  readonly redo: boolean;
}

/** Extension-owned contextual controls mounted within the document workspace. */
export interface BlockEditorSlots {
  /** @returns Host-owned document actions within the shared themed header. */
  readonly "header-actions"?: () => unknown;
  /** @param context - Current canonical editor and edit policy. @returns Host-owned toolbar content. */
  readonly tools?: (context: BlockEditorToolsContext) => unknown;
}

/** Context supplied to extension-owned tool surfaces. */
export interface BlockEditorToolsContext {
  /** Canonical command and selection owner. */
  readonly editor: Editor;
  /** Current product edit policy. */
  readonly editable: boolean;
  /** Scroll and clipping owner for document-anchored controls. */
  readonly viewport: HTMLElement;
}
