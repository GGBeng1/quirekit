import type { EditorState } from "./state";
import type { Transaction } from "./transaction";

/**
 * Minimal editor view contract consumed by vendored ProseMirror state APIs.
 */
export interface EditorView {
  /**
   * Current editor state exposed by the view.
   */
  state: EditorState;

  /**
   * Dispatches a transaction through the view.
   */
  dispatch: (transaction: Transaction) => void;

  /**
   * Reports whether the cursor is at the edge of a text block.
   */
  endOfTextblock: (direction: "up" | "down" | "left" | "right" | "forward" | "backward", state?: EditorState) => boolean;

  /**
   * Whether the view is currently handling IME composition.
   */
  composing?: boolean;

  /**
   * Whether the editor is currently editable.
   */
  editable?: boolean;
}

/**
 * Minimal view props contract accepted by vendored ProseMirror plugins.
 */
export interface EditorProps<This = unknown> {
  /**
   * Handles a keydown event for the editor view.
   */
  handleKeyDown?: (this: This, view: EditorView, event: KeyboardEvent) => boolean | void;

  /**
   * Handles plain text input before it is committed to the document.
   */
  handleTextInput?: (this: This, view: EditorView, from: number, to: number, text: string) => boolean | void;

  /**
   * Handles DOM events by event name.
   */
  handleDOMEvents?: {
    /**
     * Handles a DOM event for the editor view.
     */
    [eventName: string]: (this: This, view: EditorView, event: Event) => boolean | void;
  };

  /**
   * Allows additional view props until the canvas view boundary is complete.
   */
  [propName: string]: unknown;
}
