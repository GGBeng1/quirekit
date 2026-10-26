import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import { createWhiteboardDocument, type WhiteboardDocument, type WhiteboardEditRequest } from "@quirekit/whiteboard";
import "./commands";
import type { MsfeWhiteboardOptions } from "./types";
import { whiteboardInsertionTarget } from "./insertion";
import { v4 as uuidv4 } from "uuid";

/** @param editor - Source owner. @param range - Exact current intent. @param board - Existing board, omitted when inserting.
 * @returns A task whose captured source identity follows unrelated edits. */
export function captureMsfeWhiteboardRequest(editor: MsfeEditor, range: MsfeSourceRange, board?: WhiteboardDocument): WhiteboardEditRequest | null {
  if (editor.state.readOnly || editor.mode === "locked" || editor.scope.disposed) return null;
  if (!board) {
    const target = whiteboardInsertionTarget(editor.state, range.from);
    if (!target) return null;
    range = { from: target.from, to: target.to };
  }
  const anchor = editor.captureAnchor(range), lifetime = editor.documentScope;
  const document = board ?? createWhiteboardDocument(uuidv4());
  let alive = true;
  return { document, intent: board ? "edit" : "insert",
    /** @param next - Complete proposed revision. @returns Atomic source acceptance. */
    commit(next) {
      if (!alive || lifetime.disposed || !anchor.getRange()) return "missing";
      if (editor.state.readOnly || editor.mode === "locked") return "readonly";
      const target = anchor.target(); if (!target) return "conflict";
      if (next.id !== document.id || next.revision !== document.revision + 1) return "conflict";
      return editor.chain(target).commitWhiteboard(next, !board).run() ? "saved" : "conflict";
    },
    /** Releases the mapped target without modifying source. */
    release() { if (!alive) return; alive = false; anchor.release(); if (!editor.scope.disposed) editor.focus(); }
  };
}
const active = new WeakSet<MsfeEditor>();
/** @param editor - Mounted source owner. @param open - Host task renderer. @param range - Optional mapped insertion range. @param board - Existing source.
 * @returns Whether a modal task opened, without mutating Markdown. */
export function openMsfeWhiteboard(editor: MsfeEditor, open: MsfeWhiteboardOptions["open"], range: MsfeSourceRange = editor.state.selection.main, board?: WhiteboardDocument): boolean {
  if (!open || active.has(editor)) return false;
  const request = captureMsfeWhiteboardRequest(editor, range, board); if (!request) return false;
  active.add(editor);
  let cleanup: (() => void) | undefined;
  try {
    const handle = open({ ...request, release() { request.release(); active.delete(editor); cleanup?.(); } }, editor);
    cleanup = editor.scope.own(() => handle.close()); return true;
  } catch (error) { request.release(); active.delete(editor); throw error; }
}
