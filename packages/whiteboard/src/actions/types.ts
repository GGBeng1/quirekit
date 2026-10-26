import type { WhiteboardDocument } from "../types";

/** Framework-neutral facts and exact-target actions for a selected preview. */
export interface WhiteboardPreviewActions {
  /** Canonical immutable document, including its saved preview. */ readonly document: WhiteboardDocument;
  /** Current host permission. */ readonly readOnly: boolean;
  /** Opens the captured whiteboard for drawing. */ edit(): void;
  /** Opens the captured title for an atomic rename. */ rename(): void;
}

/** Disposable product UI mounted only while a preview is active. */
export interface WhiteboardActionsHandle {
  /** @param actions - Latest canonical facts and exact callbacks. */ update(actions: WhiteboardPreviewActions): void;
  /** Releases listeners and mounted components. */ destroy(): void;
}

/** Host UI port; semantic preview packages do not import Vue. */
export type WhiteboardActionsMount<Container> = (container: Container, actions: WhiteboardPreviewActions) => WhiteboardActionsHandle;
