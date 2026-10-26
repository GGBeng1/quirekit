import { expect, it } from "vitest";
import { createBlockEditor } from "../../index";
import { readBlockFormatting } from "../state/format";
import { blockToolbarItems } from "./catalog";
import { applyBlockUnderline } from "./underline";

it("projects visible, explicit none, legacy and mixed underlines in the bounded formatting pass", () => {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text: "A", marks: [{ type: "underline", attrs: { underlineType: "none" } }] },
    { type: "text", text: "B", marks: [{ type: "underline", attrs: { underlineType: "double", color: "#336699" } }] },
    { type: "text", text: "C", marks: [{ type: "underline" }] }
  ] }] } });
  const editor = instance.editor;
  editor.commands.setTextSelection({ from: 1, to: 2 });
  expect(readBlockFormatting(editor.state.pm)).toMatchObject({ marks: { underline: false }, underlineStyle: "none", underlineColor: "" });
  editor.commands.setTextSelection({ from: 2, to: 3 });
  const format = readBlockFormatting(editor.state.pm);
  expect(format).toMatchObject({ marks: { underline: true }, underlineStyle: "double", underlineColor: "#336699" });
  expect(blockToolbarItems(editor, format, true, false, false).flatMap(item => item.children ?? []).find(item => item.value === "underline"))
    .toMatchObject({ kind: "split", pressed: true, disclosureLabel: "下划线样式" });
  editor.commands.setTextSelection({ from: 2, to: 4 });
  expect(readBlockFormatting(editor.state.pm)).toMatchObject({ marks: { underline: true }, underlineStyle: null, underlineColor: null });
  expect(readBlockFormatting(editor.state.pm, 1)).toMatchObject({ truncated: true, underlineStyle: null, underlineColor: null });
  editor.commands.setTextSelection({ from: 1, to: 4 });
  expect(readBlockFormatting(editor.state.pm).marks.underline).toBe("mixed");
  editor.commands.setTextSelection(4);
  expect(readBlockFormatting(editor.state.pm)).toMatchObject({ underlineStyle: "single", underlineColor: "" });
  editor.commands.setUnderline({ underlineType: "wave", color: "#990099" });
  expect(readBlockFormatting(editor.state.pm)).toMatchObject({ visited: 0, underlineStyle: "wave", underlineColor: "#990099" });
  instance.destroy();
});

it("edits one field per run and refuses stale popup targets, including stored marks and read-only changes", () => {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [
    { type: "text", text: "A", marks: [{ type: "underline", attrs: { underlineType: "double", color: "#336699" } }] },
    { type: "text", text: "B", marks: [{ type: "underline", attrs: { underlineType: "wave", color: "#990099" } }] }
  ] }] } });
  const editor = instance.editor;
  editor.commands.setTextSelection({ from: 1, to: 3 });
  expect(applyBlockUnderline(editor, editor.state.pm, { color: null })).toBe(true);
  expect(editor.state.doc.firstChild!.content.content.map(node => node.marks[0]!.attrs)).toEqual([
    expect.objectContaining({ underlineType: "double", color: null }), expect.objectContaining({ underlineType: "wave", color: null })
  ]);
  editor.commands.undo();
  expect(applyBlockUnderline(editor, editor.state.pm, { underlineType: "dash" })).toBe(true);
  expect(editor.state.doc.firstChild!.content.content.map(node => node.marks[0]!.attrs)).toEqual([
    expect.objectContaining({ underlineType: "dash", color: "#336699" }), expect.objectContaining({ underlineType: "dash", color: "#990099" })
  ]);
  const selectionSource = editor.state.pm;
  editor.commands.setTextSelection(2);
  expect(applyBlockUnderline(editor, selectionSource, { underlineType: "single" })).toBe(false);
  const marksSource = editor.state.pm;
  editor.commands.setUnderline({ underlineType: "none" });
  expect(applyBlockUnderline(editor, marksSource, { color: "#000000" })).toBe(false);
  const documentSource = editor.state.pm;
  editor.commands.insertContent("New");
  expect(applyBlockUnderline(editor, documentSource, { underlineType: "wave" })).toBe(false);
  editor.setEditable(false);
  expect(applyBlockUnderline(editor, editor.state.pm, { underlineType: "wave" })).toBe(false);
  instance.destroy();
});
