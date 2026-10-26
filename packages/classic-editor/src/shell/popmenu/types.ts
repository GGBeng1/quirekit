import type { ClassicEditorPopmenuContribution } from "@classic/types";

/** Callbacks consumed by the product popmenu DOM-listener owner. */
export interface ClassicEditorPopmenuListenerOptions {
  /**
   * Opens a product popmenu for one semantic event.
   *
   * @param eventType - Contribution event type.
   * @param event - Bubbling semantic event.
   */
  readonly open: (eventType: string, event: Event) => void;
  /** Closes the active product popmenu. */
  readonly close: () => void;
}

/** DOM-listener lifecycle owned by one product popmenu component. */
export interface ClassicEditorPopmenuListeners {
  /**
   * Reconciles bubbling semantic contribution listeners.
   *
   * @param root - Current product root.
   * @param contributions - Visible popmenu contributions.
   */
  updateRoot(
    root: HTMLElement | undefined,
    contributions: readonly ClassicEditorPopmenuContribution[]
  ): void;
  /**
   * Reconciles owner-root/ancestor scroll and window-blur invalidation of client points.
   *
   * @param ownerDocument - Document that owns the current shell.
   */
  updateDocument(ownerDocument: Document | undefined): void;
  /** Releases every semantic and dismissal listener. */
  destroy(): void;
}

/** Screen-anchored state for one active semantic product popmenu. */
export interface ClassicEditorActivePopmenu {
  /** Contribution that owns the visible menu. */
  readonly contributionId: string;
  /** Semantic mounted-View event detail. */
  readonly detail: unknown;
  /** Browser client x coordinate. */
  readonly x: number;
  /** Browser client y coordinate. */
  readonly y: number;
}
