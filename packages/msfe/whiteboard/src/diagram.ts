import type { MsfeEditor } from "@quirekit/msfe-core";
import { prepareWhiteboardDiagram, readWhiteboardDocument, type WhiteboardDiagramPatch,
  type WhiteboardSceneRenderer, type WhiteboardCommitResult } from "@quirekit/whiteboard";
import { captureMsfeWhiteboardRequest } from "./session";
import type { MsfeWhiteboardDiagramTarget } from "./types";

/**
 * Host/model entry point using the same diagram contract as Classic and Block.
 * @param editor - Canonical source owner.
 * @param patch - Incremental node/edge changes.
 * @param render - Explicit snapshot preparation capability.
 * @param target - Existing board identity and revision; omit to insert at captured selection.
 * @returns Source commit result after asynchronous preparation and target revalidation.
 */
export async function applyMsfeWhiteboardDiagram(editor: MsfeEditor, patch: WhiteboardDiagramPatch,
  render: WhiteboardSceneRenderer, target?: MsfeWhiteboardDiagramTarget): Promise<WhiteboardCommitResult> {
  if (editor.state.readOnly || editor.mode === "locked") return "readonly";
  if (editor.scope.disposed) return "missing";
  const matches = target ? editor.querySource("whiteboard", { from: 0, to: editor.state.doc.length }).matches
    .filter(match => (match.attrs.board as { id?: string } | undefined)?.id === target.id) : [];
  if (target && matches.length !== 1) return "missing";
  const match = matches[0], board = match ? readWhiteboardDocument(match.attrs.board) : undefined;
  if (target && board?.revision !== target.revision) return "conflict";
  const range = match ? { from: match.from, to: match.to } : editor.state.selection.main;
  const request = captureMsfeWhiteboardRequest(editor, range, board);
  if (!request) return "missing";
  try { return request.commit(await prepareWhiteboardDiagram(request.document, patch, render)); }
  finally { request.release(); }
}
