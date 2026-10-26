import type { MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import { createFlowchartEmbed, serializeFlowchartEmbed, type FlowchartEmbed, type FlowchartEditRequest } from "@quirekit/flowchart";
import "./commands";
import type { MsfeFlowchartOptions } from "./types";
import { flowchartInsertionTarget } from "./insertion";
import { v4 as uuidv4 } from "uuid";

/** @param editor - Source owner. @param range - Exact current intent. @param flow - Existing flow, omitted when inserting.
 * @returns A task whose captured source identity follows unrelated edits. */
export function captureMsfeFlowchartRequest(editor: MsfeEditor, range: MsfeSourceRange, flow?: FlowchartEmbed): FlowchartEditRequest | null {
  if (editor.state.readOnly || editor.mode === "locked" || editor.scope.disposed) return null;
  if (flow) {
    const match = editor.querySource("flowchart", range).matches.find(item => item.from === range.from && item.to === range.to);
    if (!match || serializeFlowchartEmbed(match.attrs.flow as FlowchartEmbed) !== serializeFlowchartEmbed(flow)) return null;
  }
  if (!flow) {
    const target = flowchartInsertionTarget(editor.state, range.from);
    if (!target) return null;
    range = { from: target.from, to: target.to };
  }
  const anchor = editor.captureAnchor(range), lifetime = editor.documentScope;
  const document = flow ?? createFlowchartEmbed(uuidv4());
  let alive = true, committed = false;
  return { document,
    /** @param next - Complete proposed revision. @returns Atomic source acceptance. */
    commit(next) {
      if (!alive || committed || lifetime.disposed || !anchor.getRange()) return "missing";
      if (editor.state.readOnly || editor.mode === "locked") return "readonly";
      const target = anchor.target(); if (!target) return "conflict";
      if (next.id !== document.id || next.document.revision !== document.document.revision + 1) return "conflict";
      committed = editor.chain(target).commitFlowchart(next, !flow).run();
      return committed ? "saved" : "conflict";
    },
    /** Releases the mapped target without modifying source. */
    release() { if (!alive) return; alive = false; anchor.release(); if (!editor.scope.disposed) editor.focus(); }
  };
}
const active = new WeakSet<MsfeEditor>();
/** @param editor - Mounted source owner. @param open - Host task renderer. @param range - Optional mapped insertion range. @param flow - Existing source.
 * @returns Whether a modal task opened, without mutating Markdown. */
export function openMsfeFlowchart(editor: MsfeEditor, open: MsfeFlowchartOptions["open"], range: MsfeSourceRange = editor.state.selection.main, flow?: FlowchartEmbed): boolean {
  if (!open || active.has(editor)) return false;
  const request = captureMsfeFlowchartRequest(editor, range, flow); if (!request) return false;
  active.add(editor);
  let cleanup: (() => void) | undefined;
  try {
    const handle = open({ ...request, release() { request.release(); active.delete(editor); cleanup?.(); } }, editor);
    cleanup = editor.scope.own(() => handle.close()); return true;
  } catch (error) { request.release(); active.delete(editor); throw error; }
}
