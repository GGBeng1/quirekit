import type { EditorBlockMenuProvider } from "@quirekit/editor-ui";
import { openRichContent } from "../rich-content/tasks";
/** Layout actions use the same source-bound editor commands as on-canvas controls. */
export const columnsMenu: EditorBlockMenuProvider = {
  id: "columns", order: 10,
  /** @param context - Captured block. @returns Layout or adjacent-column operations. */
  getItems({ editor, block }) {
    if (block.node.type.name === "blockColumns") return [
      { value: "settings", label: "分栏布局", icon: "columns2", run: () => openRichContent(editor, "columns", undefined, block.from) },
      { value: "unwrap", label: "解除分栏", icon: "rows2", run: () => editor.commands.unwrapBlockColumns(block.from) }
    ];
    const $pos = editor.state.doc.resolve(block.from);
    if ($pos.parent.type.name !== "blockColumn") return [];
    return [
      { value: "left", label: "移至左栏", icon: "arrowLeft", isEnabled: () => editor.can().moveBlockToColumn(block.from, -1), run: () => editor.commands.moveBlockToColumn(block.from, -1) },
      { value: "right", label: "移至右栏", icon: "arrowRight", isEnabled: () => editor.can().moveBlockToColumn(block.from, 1), run: () => editor.commands.moveBlockToColumn(block.from, 1) }
    ];
  }
};
