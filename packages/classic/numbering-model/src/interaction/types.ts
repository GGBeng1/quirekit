import type { Editor } from "@quirekit/core";

/** Renderer-independent actions for one exact list marker. */
export interface WordNumberingMarkerAction {
  /** Stable action identity. */
  readonly id: "restart" | "continue" | "clear";
  /** Product localization key shared by the list menu consumers. */
  readonly label: "restartNumbering" | "continueNumbering" | "undoAutomaticNumbering" | "removeBullets";
  /** @param editor - Canonical command owner. @returns Whether this exact target can change. */
  readonly canExecute: (editor: Editor) => boolean;
  /** @param editor - Canonical command owner. @returns Whether the target changed. */
  readonly execute: (editor: Editor) => boolean;
}
