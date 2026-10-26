import "@quirekit/flow-editor/styles.css";
import type { MsfeFlowchartOptions } from "@quirekit/msfe-flowchart";
import { openFlowchartDialog, readFlowEditorLocale } from "@quirekit/flow-editor";
import { mdDialogTheme } from "../dialog-theme";
import { mdDiagramPreviewUpload } from "../../images/diagram";

/** One shared task renderer; source matching, mapping and history belong to MSFE. */
export const openMdFlowchartDialog: NonNullable<MsfeFlowchartOptions["open"]> = (request, editor) => {
  return openFlowchartDialog({ request, locale: readFlowEditorLocale(editor.element), ownerDocument: editor.element.ownerDocument, theme: mdDialogTheme(editor), signal: editor.scope.signal, uploadPreview: mdDiagramPreviewUpload(editor) });
};
