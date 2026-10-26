import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import { createMindMapEmbed, serializeMindMapEmbed, type MindMapEmbed, type MindMapEditRequest } from "@quirekit/mind-map";
import "./commands";
import type { MsfeMindMapOptions } from "./types";
import { mindMapInsertionTarget } from "./insertion";
import { v4 as uuidv4 } from "uuid";

/** @param editor - Source owner. @param range - Exact current intent. @param mind - Existing mind, omitted when inserting.
 * @returns A task whose captured source identity follows unrelated edits. */
export function captureMsfeMindMapRequest(editor: MsfeEditor, range: MsfeSourceRange, mind?: MindMapEmbed): MindMapEditRequest | null {
  if (editor.state.readOnly || editor.mode === "locked" || editor.scope.disposed) return null;
  if (mind) {
    const match = editor.querySource("mindMap", range).matches.find(item => item.from === range.from && item.to === range.to);
    if (!match || serializeMindMapEmbed(match.attrs.mind as MindMapEmbed) !== serializeMindMapEmbed(mind)) return null;
  }
  if (!mind) {
    const target = mindMapInsertionTarget(editor.state, range.from);
    if (!target) return null;
    range = { from: target.from, to: target.to };
  }
  const anchor = editor.captureAnchor(range), lifetime = editor.documentScope;
  const document = mind ?? createMindMapEmbed(uuidv4());
  let alive = true, committed = false;
  return { document, intent: mind ? "edit" : "insert",
    /** @param next - Complete proposed revision. @returns Atomic source acceptance. */
    commit(next) {
      if (!alive || committed || lifetime.disposed || !anchor.getRange()) return "missing";
      if (editor.state.readOnly || editor.mode === "locked") return "readonly";
      const target = anchor.target(); if (!target) return "conflict";
      if (next.id !== document.id || next.document.revision !== document.document.revision + 1) return "conflict";
      committed = editor.chain(target).commitMindMap(next, !mind).run();
      return committed ? "saved" : "conflict";
    },
    /** Releases the mapped target without modifying source. */
    release() { if (!alive) return; alive = false; anchor.release(); if (!editor.scope.disposed) editor.focus(); }
  };
}
const active = new WeakSet<MsfeEditor>();
/** @param editor - Mounted source owner. @param open - Host task renderer. @param range - Optional mapped insertion range. @param mind - Existing source.
 * @returns Whether a modal task opened, without mutating Markdown. */
export function openMsfeMindMap(editor: MsfeEditor, open: MsfeMindMapOptions["open"], range: MsfeSourceRange = editor.state.selection.main, mind?: MindMapEmbed): boolean {
  if (!open || active.has(editor)) return false;
  const request = captureMsfeMindMapRequest(editor, range, mind); if (!request) return false;
  active.add(editor);
  let cleanup: (() => void) | undefined;
  try {
    const handle = open({ ...request, release() { request.release(); active.delete(editor); cleanup?.(); } }, editor);
    cleanup = editor.scope.own(() => handle.close()); return true;
  } catch (error) { request.release(); active.delete(editor); throw error; }
}
