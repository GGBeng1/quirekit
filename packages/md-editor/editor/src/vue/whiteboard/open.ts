import "@quirekit/whiteboard-editor/styles.css";
import type { MsfeWhiteboardOptions } from "@quirekit/msfe-whiteboard";
import { openWhiteboardDialog, whiteboardDraftsFor, readWhiteboardLocale } from "@quirekit/whiteboard-editor";
import { mdDialogTheme } from "../dialog-theme";
import { mdDiagramPreviewUpload } from "../../images/diagram";
export { mountWhiteboardActions } from "@quirekit/whiteboard-editor";

/** One shared task renderer; source matching, mapping and history belong to MSFE. */
export const openMdWhiteboardDialog: NonNullable<MsfeWhiteboardOptions["open"]> = (request, editor) => {
  return openWhiteboardDialog({ request, drafts: whiteboardDraftsFor(editor, request), ownerDocument: editor.element.ownerDocument, locale: readWhiteboardLocale(editor.element), theme: mdDialogTheme(editor), signal: editor.scope.signal, uploadPreview: mdDiagramPreviewUpload(editor) });
};
/** @param request - Captured mapped source and commit. @param editor - Palette and lifetime owner. @returns Disposable title task. */
export const renameMdWhiteboard: NonNullable<MsfeWhiteboardOptions["open"]> = (request, editor) => {
  return openWhiteboardDialog({ request, ownerDocument: editor.element.ownerDocument, locale: readWhiteboardLocale(editor.element), theme: mdDialogTheme(editor), signal: editor.scope.signal, mode: "rename" });
};
