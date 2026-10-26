import type { QuireEditor } from "@quirekit/core";
import type { ProofingController, ProofingExtensionOptions } from "../types";
import { ProofingSession } from "./session";

/** Sessions by editor. */
const sessions = new WeakMap<QuireEditor, ProofingSession>();

/**
 * Starts the proofing session of an editor.
 *
 * @param editor - Editor.
 * @param options - Extension options.
 * @returns Session.
 */
export function installProofingSession(editor: QuireEditor, options: ProofingExtensionOptions): ProofingSession {
  sessions.get(editor)?.destroy();
  const session = new ProofingSession(editor, options);
  sessions.set(editor, session);
  return session;
}

/**
 * Returns the running session of an editor.
 *
 * @param editor - Editor.
 * @returns Session, or undefined when the extension is not installed.
 */
export function readProofingSession(editor: QuireEditor): ProofingSession | undefined {
  return sessions.get(editor);
}

/**
 * Returns the asynchronous proofing operations of an editor.
 *
 * @param editor - Editor.
 * @returns Controller, or undefined when the extension is not installed.
 */
export function getProofingController(editor: QuireEditor): ProofingController | undefined {
  return sessions.get(editor);
}

/**
 * Stops the session of an editor.
 *
 * @param editor - Editor.
 */
export function destroyProofingSession(editor: QuireEditor): void {
  sessions.get(editor)?.destroy();
  sessions.delete(editor);
}
