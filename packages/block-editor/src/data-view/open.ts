import "@quirekit/data-view-editor/styles.css";
import { createTheme } from "@quirekit/ui";
import { openDataViewDialog } from "@quirekit/data-view-editor";
import { openDataView, type DataViewOptions } from "@quirekit/extension-data-view";
import type { QuireEditor, Range } from "@quirekit/core";

/**
 * Opens the shared workspace with the owning editor's theme.
 * @param request - Source-bound editing request and commit bridge.
 * @param editor - Mounted editor that owns the draft.
 * @returns Idempotent workspace cancellation handle.
 */
export const openBlockDataView: NonNullable<DataViewOptions["open"]> = (request, editor) => openDataViewDialog({
  request,
  ownerDocument: editor.view.dom.ownerDocument,
  theme: createTheme({
    scheme: editor.view.dom.closest<HTMLElement>("[data-qk-scheme]")?.dataset.qkScheme === "dark" ? "dark" : "light"
  })
});

/** @param editor - Mounted owner. @param insertion - Explicit insertion range. @returns Whether an insertion draft opened. */
export function insertBlockDataView(editor: QuireEditor, insertion?: Range): boolean {
  const feature = editor.extensions.find(extension => extension.name === "dataView");
  return openDataView(editor, (feature?.options as DataViewOptions | undefined)?.open ?? null, undefined, insertion);
}
