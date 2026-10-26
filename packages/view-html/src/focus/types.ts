/** Focus owner recognized by one retained HTML editor root. */
export type HtmlFocusOwner =
  | "document"
  | "selection-preserving-ui"
  | "node-view-control"
  | "nested-embed"
  | "outside";

/** Internal focus scope attached to retained HTML integration controls. */
export type HtmlFocusScope = "preserve-selection" | "nested-embed";

/** Options used to create one retained HTML focus runtime. */
export interface CreateHtmlFocusRuntimeOptions {
  /** Browser document that owns focus events. */
  readonly ownerDocument: Document;
  /** Retained document root containing NodeView controls. */
  readonly documentRoot: HTMLElement;
  /** Browser-editable surface that contains the retained document root. */
  readonly documentSurface: HTMLElement;
  /** Canonical IME input proxy for document editing. */
  readonly inputProxy: HTMLTextAreaElement;
  /** Restores keyboard input to the canonical document input proxy. */
  readonly focusDocumentInput: () => void;
  /**
   * Proves that a focused retained DOM node belongs to a custom NodeView control.
   *
   * @param target - Focused retained DOM node.
   * @returns Whether exact descriptor ownership identifies a NodeView control.
   */
  readonly isNodeViewControl: (target: Node) => boolean;
  /** Observes focus-owner transitions without changing editor selection. */
  readonly onOwnerChange?: ((owner: HtmlFocusOwner) => void) | undefined;
}

/** Focus ownership controller for one retained HTML editor root. */
export interface HtmlFocusRuntime {
  /** Current focus owner. */
  readonly owner: HtmlFocusOwner;
  /**
   * Classifies and applies one explicit focus target.
   *
   * @param target - Newly focused DOM node, or null when focus left the document.
   */
  transitionTo(target: Node | null): void;
  /** Restores canonical document input focus without mutating PM selection. */
  restoreDocumentFocus(): void;
  /** Removes document-level focus listeners. */
  destroy(): void;
}
