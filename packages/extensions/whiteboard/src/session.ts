import type { QuireEditor, Range } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import { createWhiteboardDocument, serializeWhiteboard, type WhiteboardEditRequest } from "@quirekit/whiteboard";
import { readWhiteboardNode } from "./source";
import type { WhiteboardOptions } from "./types";
import "./commands";
import { v4 as uuidv4 } from "uuid";

/** @param editor - Owning document. @param position - Existing atom, or insertion at selection. @param insertion - Explicit range for insertion; independent of focus. @returns Isolated mapped task, or refusal. */
export function captureWhiteboardRequest(editor: QuireEditor, position?: number, insertion?: Range): WhiteboardEditRequest | null {
  if (!editor.isEditable || editor.isDestroyed || !editor.state.pm.schema.nodes.whiteboard) return null;
  if (insertion && (position !== undefined || !Number.isInteger(insertion.from) || !Number.isInteger(insertion.to) || insertion.from < 0 || insertion.to < insertion.from || insertion.to > editor.state.doc.content.size)) return null;
  const node = position === undefined ? null : editor.state.pm.doc.nodeAt(position);
  if (position !== undefined && node?.type.name !== "whiteboard") return null;
  const document = node ? readWhiteboardNode(node) : createWhiteboardDocument(uuidv4());
  if (!document) return null;
  const expected = serializeWhiteboard(document);
  let from = position ?? insertion?.from ?? editor.state.pm.selection.from, to = position === undefined ? insertion?.to ?? editor.state.pm.selection.to : position + 1;
  const selected = editor.state.pm.doc.slice(from, to).content;
  let alive = true, removed = false, committed = false;
  /** @param event - Accepted transactions, including appended normalization. */
  function map(event: { transaction: Transaction; appendedTransactions?: readonly Transaction[] }): void {
    for (const tr of [event.transaction, ...(event.appendedTransactions ?? [])]) {
      if (!tr.docChanged) continue;
      const start = tr.mapping.mapResult(from, 1), end = tr.mapping.mapResult(to, -1);
      if (start.deletedAcross || end.deletedAcross || (insertion && (start.deleted || end.deleted)) || (position !== undefined && start.deleted && tr.doc.nodeAt(start.pos)?.type.name !== "whiteboard")) removed = true;
      from = start.pos; to = Math.max(from, end.pos);
    }
  }
  editor.on("transaction", map);
  return { document, intent: position === undefined ? "insert" : "edit",
    /** @param next - Complete proposed revision. @returns Atomic source acceptance. */
    commit(next) {
      if (!alive || committed || editor.isDestroyed || removed) return "missing";
      if (!editor.isEditable) return "readonly";
      if (next.id !== document.id || next.revision !== document.revision + 1) return "conflict";
      if (position !== undefined) {
        const current = editor.state.pm.doc.nodeAt(from);
        if (!current || current.type.name !== "whiteboard") return "missing";
        const board = readWhiteboardNode(current);
        if (!board || serializeWhiteboard(board) !== expected) return "conflict";
        committed = editor.commands.updateWhiteboard({ position: from, expected, document: next });
        return committed ? "saved" : "conflict";
      }
      if (to > editor.state.pm.doc.content.size || !editor.state.pm.doc.slice(from, to).content.eq(selected)) return "conflict";
      committed = editor.commands.insertWhiteboard({ document: next, from, to });
      return committed ? "saved" : "conflict";
    },
    /** Releases the mapped target without modifying source. */
    release() { if (!alive) return; alive = false; editor.off("transaction", map); if (!editor.isDestroyed) editor.commands.focus(); }
  };
}

/** @param editor - Mounted instance. @param open - Product-owned UI factory. @param position - Optional existing block.
 * @param insertion - Explicit insertion range captured by a host entry point.
 * @returns Whether a new task was opened; only one task per editor is allowed. */
export function openWhiteboard(editor: QuireEditor, open: WhiteboardOptions["open"], position?: number, insertion?: Range): boolean {
  if (!open || active.has(editor)) return false;
  const request = captureWhiteboardRequest(editor, position, insertion); if (!request) return false;
  let handle: { close(): void } | undefined;
  /** Cancels the UI if its document owner is destroyed. */
  function destroy(): void { handle?.close(); }
  active.add(editor); editor.on("destroy", destroy);
  try {
    handle = open({ ...request, release() { request.release(); active.delete(editor); editor.off("destroy", destroy); } }, editor);
    return true;
  } catch (error) { request.release(); active.delete(editor); editor.off("destroy", destroy); throw error; }
}
const active = new WeakSet<QuireEditor>();
