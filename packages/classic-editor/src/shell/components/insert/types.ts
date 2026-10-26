import type { ClassicEditorRenderContext } from "../../../types";

/** Reactive mount state retained while one workspace widget stays alive. */
export interface ClassicEditorInsertSurfaceState {
  /** Latest mounted product context after locale/backend updates. */
  context: ClassicEditorRenderContext;
}

/** Imperative port used only by the retained typed trigger action. */
export interface ClassicEditorInsertSurfaceHandle {
  /**
   * Opens this root-owned surface and remembers its exact focus-return trigger.
   *
   * @param trigger - Native trigger retained without a string action id.
   */
  open(trigger: HTMLElement | null): void;
  /** Closes this surface without mutating the document. */
  close(): void;
}
