import { createTheme } from "@quirekit/ui";
import { openMindMapDialog, mindMapRecoveryFor } from "@quirekit/mind-editor";
import { openMindMap, type MindMapOptions } from "@quirekit/extension-mind-map";
import type { QuireEditor, Range } from "@quirekit/core";

/** @param request - Captured host target. @param editor - Mounted document. @param insertion - Explicit target, when provided. @returns Shared insertion/editing dialog. */
export const openBlockMindMapDialog: NonNullable<MindMapOptions["open"]> = (request, editor) => {
  const scheme = editor.view.dom.closest<HTMLElement>("[data-qk-scheme]")?.dataset.qkScheme === "dark" ? "dark" : "light";
  return openMindMapDialog({ request, recovery: mindMapRecoveryFor(editor, request), locale: editor.view.dom.closest<HTMLElement>("[lang]")?.lang ?? "zh-CN", ownerDocument: editor.view.dom.ownerDocument, theme: createTheme({ scheme }) });
};
/** @param editor - Mounted document. @param insertion - Explicit target, when provided. @returns Whether an isolated insertion draft opened. */
export function insertBlockMindMap(editor: QuireEditor, insertion?: Range): boolean { return openMindMap(editor, openBlockMindMapDialog, undefined, insertion); }
