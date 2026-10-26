import "@quirekit/text-diagram-editor/styles.css";
import { createTheme } from "@quirekit/ui";
import { openTextDiagramDialog } from "@quirekit/text-diagram-editor";
import { openTextDiagram, type TextDiagramOptions } from "@quirekit/extension-text-diagram";
import type { QuireEditor, Range } from "@quirekit/core";

/** Product task shared by the insertion menu and object activation. */
export const openBlockTextDiagramDialog: NonNullable<TextDiagramOptions["open"]> = (request, editor) => {
  const scheme = editor.view.dom.closest<HTMLElement>("[data-qk-scheme]")?.dataset.qkScheme === "dark" ? "dark" : "light";
  return openTextDiagramDialog({ request, locale: editor.view.dom.closest("[lang]")?.getAttribute("lang") ?? "zh-CN", ownerDocument: editor.view.dom.ownerDocument, theme: createTheme({ scheme }) });
};
/** @param editor - Mounted document. @param insertion - Explicit target, when provided. @returns Whether an isolated insertion draft opened. */
export function insertBlockTextDiagram(editor: QuireEditor, insertion?: Range): boolean { return openTextDiagram(editor, openBlockTextDiagramDialog, undefined, insertion); }
