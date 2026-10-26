import { openDataView, type DataViewOptions } from "@quirekit/extension-data-view";
import type { EditorBlockMenuProvider } from "@quirekit/editor-ui";

/** Reuses the installed source workspace instead of opening a disconnected data copy. */
export const blockDataViewMenu: EditorBlockMenuProvider = {
  id: "data-view", order: 10,
  /** @param context - Canonical data object. @returns Workspace entry only when its service is installed. */
  getItems({ editor, block }) {
    if (block.node.type.name !== "dataView") return [];
    const open = (editor.extensions.find(extension => extension.name === "dataView")?.options as DataViewOptions | undefined)?.open;
    return open ? [{ value: "edit", label: "编辑多维表格", icon: "table", run: () => openDataView(editor, open, block.from) }] : [];
  }
};
