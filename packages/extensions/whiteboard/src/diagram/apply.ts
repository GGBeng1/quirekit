import type { QuireEditor } from "@quirekit/core";
import { prepareWhiteboardDiagram, type WhiteboardDiagramPatch, type WhiteboardSceneRenderer, type WhiteboardCommitResult } from "@quirekit/whiteboard";
import { captureWhiteboardRequest } from "../session";

/**
 * Shared public API for hosts/agents without the first-party document SDK.
 * @param editor - Owning Classic/Block Core editor.
 * @param patch - Native diagram edits.
 * @param render - Explicit offscreen rendering authority.
 * @param position - Existing atom; omitted inserts at captured selection.
 * @returns Atomic result after preparation, with one history event on success.
 */
export async function applyWhiteboardDiagram(editor: QuireEditor, patch: WhiteboardDiagramPatch,
  render: WhiteboardSceneRenderer, position?: number): Promise<WhiteboardCommitResult> {
  const request = captureWhiteboardRequest(editor, position);
  if (!request) return editor.isEditable ? "missing" : "readonly";
  try { return request.commit(await prepareWhiteboardDiagram(request.document, patch, render)); }
  finally { request.release(); }
}
