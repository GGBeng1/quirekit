import { sourceRevealSetting, type MsfeEditor, type MsfeResult } from "@quirekit/msfe-core";
import type { MdEditableView, MdEditingMode } from "../types";

/** @param editor - Mounted product. @param mode - Requested editing experience. @returns Input-safe acceptance without changing document or history. */
export function setMdEditingMode(editor: MsfeEditor, mode: MdEditingMode): MsfeResult {
  if (mode !== "document" && mode !== "markdown") return { ok: false, reason: "invalid-change" };
  return sourceRevealSetting.set(editor, mode === "document" ? "hidden" : "selection");
}

/** @param editor - Mounted product. @returns Applied preference, or undefined for an unrelated MSFE instance. */
export function getMdEditingMode(editor: MsfeEditor): MdEditingMode | undefined {
  const value = sourceRevealSetting.read(editor.state);
  return value === undefined ? undefined : value === "hidden" ? "document" : "markdown";
}

/**
 * Shows one editable view; read-only only stops input, so links, folds and copying keep working.
 * @param editor - Mounted product.
 * @param view - Document, live preview or source.
 * @param readOnly - Whether input stops; defaults to the editor's current permission.
 * @returns Input-safe acceptance of the marker reveal; document and history are unchanged.
 */
export function setMdView(editor: MsfeEditor, view: MdEditableView, readOnly = editor.state.readOnly): MsfeResult {
  if (view !== "document" && view !== "preview" && view !== "source") return { ok: false, reason: "invalid-change" };
  editor.setReadOnly(readOnly);
  editor.setMode(view === "source" ? "source" : "live");
  return view === "source" ? { ok: true } : setMdEditingMode(editor, view === "preview" ? "markdown" : "document");
}

/** @param editor - Mounted product. @returns Current editable view, or undefined for an unrelated MSFE instance. */
export function getMdView(editor: MsfeEditor): MdEditableView | undefined {
  if (editor.mode === "source") return "source";
  const reveal = getMdEditingMode(editor);
  return reveal === undefined ? undefined : reveal === "markdown" ? "preview" : "document";
}
