import "@quirekit/mind-editor/styles.css";
import type { MsfeMindMapOptions } from "@quirekit/msfe-mind-map";
import { openMindMapDialog, mindMapRecoveryFor } from "@quirekit/mind-editor";
import { mdDialogTheme } from "../dialog-theme";
import { mdDiagramPreviewUpload } from "../../images/diagram";

/** @param request - Captured source target. @param editor - Mounted source owner. @returns Shared dialog bound to its lifetime. */
export const openMdMindMapDialog: NonNullable<MsfeMindMapOptions["open"]> = (request, editor) => {
  return openMindMapDialog({ request, recovery: mindMapRecoveryFor(editor, request), locale: editor.element.closest<HTMLElement>("[lang]")?.lang ?? "zh-CN", ownerDocument: editor.element.ownerDocument, theme: mdDialogTheme(editor), signal: editor.scope.signal, uploadPreview: mdDiagramPreviewUpload(editor) });
};
