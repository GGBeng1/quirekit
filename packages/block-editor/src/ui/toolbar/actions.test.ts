import { expect, it } from "vitest";
import { createBlockEditor } from "../../index";
import { executeBlockToolbarAction } from "./actions";
import { blockToolbarItems } from "./catalog";
import { readBlockFormatting } from "../state/format";

it("enables format paste only after capture and reuses the snapshot across selections", () => {
  const instance = createBlockEditor({ content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }] },
    { type: "paragraph", content: [{ type: "text", text: "Plain" }] }
  ] } });
  const editor = instance.editor;
  /** @returns Current public paste control. */
  function pasteItem() {
    return blockToolbarItems(editor, readBlockFormatting(editor.state.pm), editor.isEditable, false, false)
      .flatMap(item => item.children ?? []).find(item => item.value === "pasteFormatting")!;
  }
  expect(pasteItem().disabled).toBe(true);
  editor.commands.setTextSelection({ from: 1, to: 5 });
  expect(executeBlockToolbarAction(editor, "copyFormatting")).toBe(true);
  expect(readBlockFormatting(editor.state.pm)).toMatchObject({ painter: false, hasCopiedFormat: true });
  expect(pasteItem().disabled).toBe(false);
  editor.commands.setTextSelection({ from: 7, to: 12 });
  editor.view.dispatchEvent(new Event("pointerup"));
  expect(editor.isActive("bold")).toBe(false);
  expect(executeBlockToolbarAction(editor, "pasteFormatting")).toBe(true);
  expect(editor.isActive("bold")).toBe(true);
  expect(pasteItem().disabled).toBe(false);
  editor.setEditable(false);
  expect(pasteItem().disabled).toBe(true);
  expect(readBlockFormatting(editor.state.pm).hasCopiedFormat).toBe(false);
  instance.destroy();
});

it("applies additional text formatting and clears it through existing commands", () => {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Word" }] }] } });
  const editor = instance.editor;
  editor.commands.setTextSelection({ from: 1, to: 5 });
  expect(executeBlockToolbarAction(editor, "superscript")).toBe(true);
  expect(editor.isActive("superscript")).toBe(true);
  expect(executeBlockToolbarAction(editor, "subscript")).toBe(true);
  expect(editor.isActive("superscript")).toBe(false);
  expect(executeBlockToolbarAction(editor, "background:#fef08a")).toBe(true);
  expect(editor.getAttributes("textStyle").backgroundColor).toBe("#fef08a");
  expect(executeBlockToolbarAction(editor, "clearFormatting")).toBe(true);
  expect(editor.state.doc.firstChild!.firstChild!.marks).toHaveLength(0);
  editor.setEditable(false);
  expect(executeBlockToolbarAction(editor, "code")).toBe(false);
  instance.destroy();
});
