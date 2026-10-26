import "@quirekit/data-view-editor/styles.css";
import { mdDialogTheme } from "../dialog-theme";
import { openDataViewDialog } from "@quirekit/data-view-editor";
import type { MsfeDataViewOptions } from "@quirekit/msfe-data-view";

/**
 * Binds source editing to the mounted editor's lifetime and theme.
 * @param request - Source-bound editing request and commit bridge.
 * @param editor - Mounted source editor that owns the draft.
 * @returns Idempotent workspace cancellation handle.
 */
export const openMdDataView: NonNullable<MsfeDataViewOptions["open"]> = (request, editor) => openDataViewDialog({
  request,
  ownerDocument: editor.element.ownerDocument,
  signal: editor.scope.signal,
  theme: mdDialogTheme(editor)
});
