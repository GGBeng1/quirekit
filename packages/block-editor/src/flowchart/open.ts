import { createTheme } from "@quirekit/ui";
import { openFlowchartDialog, readFlowEditorLocale } from "@quirekit/flow-editor";
import { openFlowchart, type FlowchartOptions } from "@quirekit/extension-flowchart";
import type { QuireEditor, Range } from "@quirekit/core";

/** Product task shared by the insertion menu and object activation. */
export const openBlockFlowchartDialog: NonNullable<FlowchartOptions["open"]> = (request, editor) => {
  const scheme = editor.view.dom.closest<HTMLElement>("[data-qk-scheme]")?.dataset.qkScheme === "dark" ? "dark" : "light";
  return openFlowchartDialog({ request, locale: readFlowEditorLocale(editor.view.dom), ownerDocument: editor.view.dom.ownerDocument, theme: createTheme({ scheme }) });
};
/** @param editor - Mounted document. @param insertion - Explicit target, when provided. @returns Whether an isolated insertion draft opened. */
export function insertBlockFlowchart(editor: QuireEditor, insertion?: Range): boolean { return openFlowchart(editor, openBlockFlowchartDialog, undefined, insertion); }
