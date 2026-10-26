import { createEditor } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { expect, it } from "vitest";
import { WordTableExtensions } from "../../schema";

it.each([1, 3, 5])("selects the first new cell when inserting at paragraph position %i", (position) => {
  const editor = createEditor({ extensions: [...WordTableExtensions, UndoRedo], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "abcd" }] }] } });
  editor.commands.setTextSelection(position);
  const before = editor.getJSON();
  expect(editor.can().insertWordTable({ rowCount: 2, columnCount: 3 })).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.insertWordTable({ rowCount: 2, columnCount: 3 })).toBe(true);
  const selection = editor.state.pm.selection.$from;
  expect(selection.parentOffset).toBe(0);
  expect(selection.node(-1).type.name).toBe("wordTableCell");
  expect(selection.index(-2)).toBe(0);
  expect(editor.state.doc.textContent).toBe("abcd");
  const inserted = editor.getJSON();
  expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.redo()).toBe(true); expect(editor.getJSON()).toEqual(inserted);
  expect(editor.state.pm.selection.$from.node(-1).type.name).toBe("wordTableCell");
  editor.destroy();
});

it("replaces a text range and enters the new table without keeping deleted text", () => {
  const editor = createEditor({ extensions: [...WordTableExtensions], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "abcd" }] }] } });
  editor.commands.setTextSelection({ from: 2, to: 4 });
  expect(editor.commands.insertWordTable({ rowCount: 1, columnCount: 2 })).toBe(true);
  expect(editor.state.pm.selection.$from.node(-1).type.name).toBe("wordTableCell");
  editor.commands.insertContent("cell");
  expect(editor.state.doc.child(1).textContent).toBe("cell");
  expect(editor.state.doc.textContent).toBe("acelld");
  editor.destroy();
});

it("enters the inserted nested table rather than its enclosing table", () => {
  const editor = createEditor({ extensions: [...WordTableExtensions] });
  editor.commands.insertWordTable({ rowCount: 1, columnCount: 1 });
  editor.commands.insertContent("abcd");
  editor.commands.setTextSelection(6);
  expect(editor.commands.insertWordTable({ rowCount: 2, columnCount: 3 })).toBe(true);
  const selection = editor.state.pm.selection.$from;
  expect(selection.depth).toBe(7);
  expect(selection.node(-3).childCount).toBe(2);
  expect(selection.node(-2).childCount).toBe(3);
  expect(selection.parentOffset).toBe(0);
  expect(editor.state.doc.textContent).toBe("abcd");
  editor.destroy();
});
