import { createEditor, type QuireJSONContent } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { TextSelection } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { createWordTableMap } from "../../map";
import { WordTableExtensions } from "../../schema";

/**
 * Creates one table cell holding a paragraph.
 *
 * @param text - Cell text; empty for an empty cell.
 * @param attrs - Optional cell attributes.
 * @returns Cell JSON.
 */
function cell(text: string, attrs?: Record<string, unknown>): QuireJSONContent {
  return {
    type: "wordTableCell",
    ...(attrs === undefined ? {} : { attrs }),
    content: [{ type: "paragraph", content: text === "" ? [] : [{ type: "text", text }] }]
  };
}

/**
 * Creates an editor holding one table built from row cell lists.
 *
 * @param rows - Rows of cells.
 * @returns Editor with table behavior and history.
 */
function createTableEditor(rows: readonly (readonly QuireJSONContent[])[]) {
  return createEditor({
    extensions: [...WordTableExtensions, UndoRedo],
    content: {
      type: "doc",
      content: [{
        type: "wordTable",
        content: rows.map((row) => ({ type: "wordTableRow", content: [...row] }))
      }]
    }
  });
}

/**
 * Places the caret at the end of the first paragraph containing the text.
 *
 * @param editor - Test editor.
 * @param text - Paragraph text to find.
 */
function placeCaretAfter(editor: ReturnType<typeof createTableEditor>, text: string): void {
  let target = -1;
  editor.state.doc.descendants((node, position) => {
    if (node.isTextblock && node.textContent === text) target = position + 1 + node.content.size;
    return target < 0;
  });
  editor.view.dispatch(editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, target)));
}

/**
 * Returns the text currently covered by the selection.
 *
 * @param editor - Test editor.
 * @returns Selected text.
 */
function selectedText(editor: ReturnType<typeof createTableEditor>): string {
  const { from, to } = editor.state.pm.selection;
  return editor.state.doc.textBetween(from, to);
}

describe("Word table cell traversal", () => {
  it("moves forward and backward selecting the target cell content", () => {
    const editor = createTableEditor([[cell("A"), cell("B")], [cell("C"), cell("D")]]);
    placeCaretAfter(editor, "A");
    expect(editor.commands.moveToWordTableCell("forward")).toBe(true);
    expect(selectedText(editor)).toBe("B");
    expect(editor.commands.moveToWordTableCell("forward")).toBe(true);
    expect(selectedText(editor)).toBe("C");
    expect(editor.commands.moveToWordTableCell("backward")).toBe(true);
    expect(selectedText(editor)).toBe("B");
    placeCaretAfter(editor, "A");
    expect(editor.commands.moveToWordTableCell("backward")).toBe(true);
    expect(selectedText(editor)).toBe("A");
    editor.destroy();
  });

  it("skips vertically merged continuation cells", () => {
    const editor = createTableEditor([
      [cell("A", { vMerge: "restart" }), cell("B")],
      [cell("", { vMerge: "continue" }), cell("D")]
    ]);
    placeCaretAfter(editor, "B");
    expect(editor.commands.moveToWordTableCell("forward")).toBe(true);
    expect(selectedText(editor)).toBe("D");
    editor.destroy();
  });

  it("appends a row from the last cell in one undoable step", () => {
    const editor = createTableEditor([[cell("A"), cell("B")]]);
    placeCaretAfter(editor, "B");
    expect(editor.commands.moveToWordTableCell("forward")).toBe(true);
    const table = editor.state.doc.child(0);
    expect(createWordTableMap(table).height).toBe(2);
    const { $from } = editor.state.pm.selection;
    expect(editor.state.pm.selection.empty).toBe(true);
    expect($from.node($from.depth - 2).type.name).toBe("wordTableRow");
    expect($from.index($from.depth - 3)).toBe(1);
    expect($from.index($from.depth - 2)).toBe(0);
    editor.commands.undo();
    expect(createWordTableMap(editor.state.doc.child(0)).height).toBe(1);
    editor.destroy();
  });

});
