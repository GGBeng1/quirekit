/// <reference path="../vue.d.ts" />
import { DataView, openDataView, type DataViewOptions } from "@quirekit/extension-data-view";
import { openDataViewDialog } from "@quirekit/data-view-editor";
import { createTheme } from "@quirekit/ui";
import { createClassicEditorRibbonAction } from "../extensions/surfaces";
import { readClassicEditorTheme } from "../shell/theme";
import { createDataViewDocxCodec } from "./docx/codec";
import { dataViewLayout } from "./layout";

/**
 * Opens the workspace with the owning product's document and theme.
 * @param request - Source-bound editing request and commit bridge.
 * @param editor - Mounted editor that owns the draft.
 * @returns Idempotent workspace cancellation handle.
 */
const open: NonNullable<DataViewOptions["open"]> = (request, editor) => {
  const root = editor.view.dom.closest<HTMLElement>(".qk-classic-editor");
  return openDataViewDialog({
    request,
    ownerDocument: editor.view.dom.ownerDocument,
    theme: root ? readClassicEditorTheme(root) : createTheme()
  });
};

/** Optional Classic assembly of MIT data source and workspace packages. */
export const ClassicDataView = DataView.extend({
  /** @returns Product UI and layout wiring. */
  addOptions() { return { open, layouts: () => [dataViewLayout()] }; },
  /** @returns Word projection as a native table that restores the block when left unchanged. */
  addDocx() { return createDataViewDocxCodec(); },
  /** @returns Existing Insert ribbon contribution. */
  addRibbonItems() {
    return [{ ...createClassicEditorRibbonAction("ribbon.data-view", "insert-content", {
      id: "insert.dataView", label: {"zh-CN": "多维表格", en: "Database"}, icon: "table", order: 245,
      /** @param context - Current owner. @returns Whether authoring is allowed. */ canExecute: context => context.editor.isEditable,
      /** @param context - Current owner. @returns Whether a draft opened. */ run: context => openDataView(context.editor, open)
    }), presentation: "icon-label" as const }];
  }
});
