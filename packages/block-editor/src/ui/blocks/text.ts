import type { EditorBlockMenuProvider } from "@quirekit/editor-ui";

/** Paragraph conversions offered only for text blocks that accept them. */
export const blockTextMenu: EditorBlockMenuProvider = {
  id: "text", order: 20,
  /** @param context - Exact text block. @returns Installed conversions with current-state feedback. */
  getItems({ editor, block, range }) {
    const node = block.node;
    if (!["paragraph", "heading"].includes(node.type.name)) return [];
    const configured = editor.extensions.find(extension => extension.name === "heading")?.options.levels;
    const levels = ([1, 2, 3, 4, 5, 6] as const).filter(level => !Array.isArray(configured) || configured.includes(level));
    const alignment = editor.commands.setBlockParagraph ? [{ value: "alignment", label: "段落对齐", icon: "alignLeft", kind: "submenu" as const, children:
      (["start", "center", "end", "justify"] as const).map((value, index) => ({ value, label: ["左对齐", "居中对齐", "右对齐", "两端对齐"][index]!, icon: ["alignLeft", "alignCenter", "alignRight", "alignJustify"][index]!,
        run: () => editor.commands.setBlockParagraph({ field: "alignment", value }) })) }] : [];
    return [...alignment, { value: "convert", label: "转换为", icon: "type", kind: "submenu", children: [
      { value: "paragraph", label: "正文", icon: "paragraph", checked: node.type.name === "paragraph",
        isEnabled: () => editor.can().chain().selectBlockRange(range).setNode("paragraph").run(),
        run: () => editor.chain().closeHistory().setNode("paragraph").run() },
      ...(editor.state.schema.nodes.heading ? levels.map(level => ({ value: `heading:${level}`, label: `标题 ${level}`, icon: "heading",
        checked: node.type.name === "heading" && node.attrs.level === level,
        isEnabled: () => editor.can().chain().selectBlockRange(range).setHeading({ level }).run(),
        run: () => editor.chain().closeHistory().setHeading({ level }).run() })) : [])
    ] }];
  }
};
