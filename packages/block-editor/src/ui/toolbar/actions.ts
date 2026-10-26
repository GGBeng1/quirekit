import type { Editor } from "@quirekit/core";
import { normalizeEditorFontSizeInput } from "@quirekit/editor-ui";
import { restoreBlockEditorFocus } from "../focus";

/**
 * Maps product intents to typed commands without duplicating feature behavior.
 * @param editor - Canonical document session.
 * @param value - Public toolbar intent.
 * @returns Whether an admitted command succeeded.
 */
export function executeBlockToolbarAction(editor: Editor, value: string): boolean {
  if (!editor.isEditable) return false;
  const applied = applyBlockToolbarAction(editor, value);
  if (applied) restoreBlockEditorFocus(editor);
  return applied;
}

/** @param editor - Canonical document session. @param value - Admitted toolbar intent. @returns Whether the command was applied. */
function applyBlockToolbarAction(editor: Editor, value: string): boolean {
  const chain = editor.chain();
  if (value.startsWith("align:") && typeof editor.commands.setBlockParagraph === "function") return chain.closeHistory().setBlockParagraph({ field: "alignment", value: value.slice(6) as "start" | "center" | "end" | "justify" }).run();
  if ((value === "indent" || value === "outdent") && typeof editor.commands.indentBlockParagraph === "function") {
    const list = editor.storage.blockLists as { kind(node: typeof editor.state.doc, doc: typeof editor.state.doc): unknown } | undefined;
    const selection = editor.state.pm.selection;
    const first = selection.$from.parent.isTextblock ? selection.$from.parent : selection.$from.nodeAfter;
    if (!first || !list?.kind(first, editor.state.doc)) return chain.closeHistory().indentBlockParagraph(value === "indent" ? 1 : -1).run();
  }
  switch (value) {
    case "undo": return typeof editor.commands.undo === "function" && chain.undo().run();
    case "redo": return typeof editor.commands.redo === "function" && chain.redo().run();
    case "bold": return typeof editor.commands.toggleBold === "function" && chain.toggleBold().run();
    case "italic": return typeof editor.commands.toggleItalic === "function" && chain.toggleItalic().run();
    case "underline": return typeof editor.commands.toggleUnderline === "function" && chain.toggleUnderline().run();
    case "strike": return typeof editor.commands.toggleStrike === "function" && chain.toggleStrike().run();
    case "code": return typeof editor.commands.toggleCode === "function" && chain.toggleCode().run();
    case "superscript": return typeof editor.commands.toggleSuperscript === "function" && chain.toggleSuperscript().run();
    case "subscript": return typeof editor.commands.toggleSubscript === "function" && chain.toggleSubscript().run();
    case "clearFormatting": return typeof editor.commands.clearFormatting === "function" && chain.clearFormatting().run();
    case "formatPainter": return typeof editor.commands.toggleFormatPainter === "function" && chain.toggleFormatPainter().run();
    case "growFont": return typeof editor.commands.increaseFontSize === "function" && chain.increaseFontSize().run();
    case "shrinkFont": return typeof editor.commands.decreaseFontSize === "function" && chain.decreaseFontSize().run();
    case "copyFormatting": return typeof editor.commands.copyFormatting === "function" && chain.copyFormatting().run();
    case "pasteFormatting": return typeof editor.commands.pasteFormatting === "function" && chain.pasteFormatting().run();
    case "background:default": return typeof editor.commands.unsetBackgroundColor === "function" && chain.unsetBackgroundColor().run();
    case "indent": return typeof editor.commands.changeBlockListLevel === "function" ? chain.changeBlockListLevel(1).run() : typeof editor.commands.sinkListItem === "function" && chain.sinkListItem("listItem").run();
    case "outdent": return typeof editor.commands.changeBlockListLevel === "function" ? chain.changeBlockListLevel(-1).run() : typeof editor.commands.liftListItem === "function" && chain.liftListItem("listItem").run();
    case "bulletList": return typeof editor.commands.toggleBlockList === "function" ? chain.toggleBlockList("bullet").run() : typeof editor.commands.toggleBulletList === "function" && chain.toggleBulletList().run();
    case "orderedList": return typeof editor.commands.toggleBlockList === "function" ? chain.toggleBlockList("ordered").run() : typeof editor.commands.toggleOrderedList === "function" && chain.toggleOrderedList().run();
    case "taskList": return !!editor.commands.toggleBlockList && chain.toggleBlockList("task").run();
    case "blockquote": return typeof editor.commands.toggleBlockquote === "function" && chain.toggleBlockquote().run();
    case "codeBlock": return typeof editor.commands.toggleCodeBlock === "function" && chain.toggleCodeBlock().run();
    case "horizontalRule": return typeof editor.commands.setHorizontalRule === "function" && chain.setHorizontalRule().run();
    case "paragraph": return typeof editor.commands.setNode === "function" && chain.setNode("paragraph").run();
    case "font:default": return typeof editor.commands.unsetFontFamily === "function" && chain.unsetFontFamily().run();
    case "color:default": return typeof editor.commands.unsetColor === "function" && chain.unsetColor().run();
  }
  if (/^heading:[1-6]$/.test(value)) return chain.setHeading({ level: Number(value.slice(8)) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
  if (value.startsWith("size:")) { const points = normalizeEditorFontSizeInput(value.slice(5)); return points !== null && chain.setFontSize(`${points}pt`).run(); }
  if (value.startsWith("font:") && value.length > 5 && !/[;{}<>]/u.test(value)) return chain.setFontFamily(value.slice(5)).run();
  if (/^color:#[a-f\d]{6}$/i.test(value)) return chain.setColor(value.slice(6)).run();
  if (/^background:#[a-f\d]{6}$/i.test(value)) return chain.setBackgroundColor(value.slice(11)).run();
  return false;
}
