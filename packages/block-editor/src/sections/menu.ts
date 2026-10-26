import type { EditorBlockMenuProvider } from "@quirekit/editor-ui";
import { sectionKey } from "./state";

/** Heading-specific actions, independent of the mounted menu surface. */
export const sectionMenu: EditorBlockMenuProvider = {
  id: "section", order: 5,
  /** @param context - Captured heading. @returns Available chapter operations. */
  getItems({ editor, block }) {
    if (block.node.type.name !== "heading") return [];
    const id = block.blockId;
    return [
      { value: "fold", label: sectionKey.getState(editor.state.pm)?.folded.has(id) ? "展开章节" : "折叠章节", icon: "chevronRight",
        isEnabled: () => editor.can().toggleBlockSection(id), run: () => editor.commands.toggleBlockSection(id) },
      { value: "duplicate", label: "创建章节副本", icon: "copy", run: () => editor.commands.duplicateBlockSection(id) },
      { value: "up", label: "上移章节", icon: "moveUp", isEnabled: () => editor.can().moveBlockSection(id, "up"), run: () => editor.commands.moveBlockSection(id, "up") },
      { value: "down", label: "下移章节", icon: "moveDown", isEnabled: () => editor.can().moveBlockSection(id, "down"), run: () => editor.commands.moveBlockSection(id, "down") }
    ];
  }
};
