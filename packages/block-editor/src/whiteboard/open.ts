import { createTheme } from "@quirekit/ui";
import { openWhiteboardDialog, createWhiteboardSceneRenderer, whiteboardDraftsFor, readWhiteboardLocale } from "@quirekit/whiteboard-editor";
export { mountWhiteboardActions } from "@quirekit/whiteboard-editor";
import { openWhiteboard, type WhiteboardOptions } from "@quirekit/extension-whiteboard";
import type { QuireEditor, Range } from "@quirekit/core";

/** Product renderer shared by insertion and the generic node's activation. */
export const openBlockWhiteboardDialog: NonNullable<WhiteboardOptions["open"]> = (request, editor) => {
  const scheme = editor.view.dom.closest<HTMLElement>("[data-qk-scheme]")?.dataset.qkScheme === "dark" ? "dark" : "light";
  return openWhiteboardDialog({ request, drafts: whiteboardDraftsFor(editor, request), ownerDocument: editor.view.dom.ownerDocument, locale: readWhiteboardLocale(editor.view.dom), theme: createTheme({ scheme }) });
};
/** @param request - Captured source and atomic commit. @param editor - Host palette and document owner. @returns Disposable title task. */
export const renameBlockWhiteboard: NonNullable<WhiteboardOptions["open"]> = (request, editor) => {
  const scheme = editor.view.dom.closest<HTMLElement>("[data-qk-scheme]")?.dataset.qkScheme === "dark" ? "dark" : "light";
  return openWhiteboardDialog({ request, ownerDocument: editor.view.dom.ownerDocument, locale: readWhiteboardLocale(editor.view.dom), theme: createTheme({ scheme }), mode: "rename" });
};
/** @param scene - Frozen source. @param editor - Instance owning the browser document. @returns Matching native scene/PNG. */
export const renderBlockWhiteboardScene: NonNullable<WhiteboardOptions["renderScene"]> = (scene, editor) =>
  createWhiteboardSceneRenderer(editor.view.dom.ownerDocument)(scene);
/** @param editor - Mounted document. @param insertion - Explicit target, when provided. @returns Whether an independent insertion draft opened. */
export function insertBlockWhiteboard(editor: QuireEditor, insertion?: Range): boolean { return openWhiteboard(editor, openBlockWhiteboardDialog, undefined, insertion); }
