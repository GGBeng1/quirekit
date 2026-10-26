import { createEditor, type QuireEditor } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { describe, expect, it, vi } from "vitest";
import { createWordTableMap } from "../map";
import { WordTableExtensions } from "../schema";
import { WordTableSelection } from "../selection";

/**
 * Creates an editor whose initial document contains one Word table.
 *
 * @param rowCount - Number of table rows to create.
 * @param columnCount - Number of table columns to create.
 * @returns Test editor instance.
 */
function createWordTableEditorWithTable(
  rowCount: number,
  columnCount: number
): QuireEditor {
  return createEditor({
    extensions: [...WordTableExtensions, UndoRedo],
    content: {
      type: "doc",
      content: [
        {
          type: "wordTable",
          content: Array.from({ length: rowCount }, () => ({
            type: "wordTableRow",
            content: Array.from({ length: columnCount }, () => ({
              type: "wordTableCell",
              content: [{ type: "paragraph" }]
            }))
          }))
        }
      ]
    }
  });
}

/**
 * Sets a structural Word table selection over explicit cell indices.
 *
 * @param editor - Editor to update.
 * @param anchorCellIndex - Anchor explicit cell index.
 * @param headCellIndex - Head explicit cell index.
 * @param mode - Optional structural selection mode.
 */
function setWordTableSelection(
  editor: QuireEditor,
  anchorCellIndex: number,
  headCellIndex: number,
  mode?: "cell" | "row" | "column" | "table"
): void {
  const table = editor.state.doc.firstChild!;
  const map = createWordTableMap(table);
  const selection = WordTableSelection.create(editor.state.doc, {
    tablePos: 0,
    anchorCellPos: map.explicitCells[anchorCellIndex]!.cellPos,
    headCellPos: map.explicitCells[headCellIndex]!.cellPos,
    ...(mode === undefined ? {} : { mode })
  });

  editor.dispatchTransaction(editor.state.pm.tr.setSelection(selection));
}

describe("Word table editor commands with structural selection", () => {
  it("word-table-editor-selection-merge uses the selected table rect", () => {
    const editor = createWordTableEditorWithTable(1, 2);

    setWordTableSelection(editor, 0, 1);

    expect(editor.commands.mergeWordTableCells({})).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(1);
  });

  it("word-table-editor-selection-format uses the selected table rect", () => {
    const editor = createWordTableEditorWithTable(1, 2);

    setWordTableSelection(editor, 0, 1);

    expect(editor.commands.setWordTableCellAttrs({
      attrs: {
        shading: { fill: "D9EAF7", color: null, pattern: "clear" }
      }
    })).toBe(true);
    expect(
      editor.state.doc.firstChild?.firstChild?.child(0).attrs.shading
    ).toEqual({ fill: "D9EAF7", color: null, pattern: "clear" });
    expect(
      editor.state.doc.firstChild?.firstChild?.child(1).attrs.shading
    ).toEqual({ fill: "D9EAF7", color: null, pattern: "clear" });
  });

  it("preserves structural selection across consecutive fill, clear, and Undo", () => {
    vi.useFakeTimers();
    try {
      const editor = createWordTableEditorWithTable(1, 2);
      setWordTableSelection(editor, 0, 1);

      expect(editor.commands.setWordTableCellAttrs({
        attrs: { backgroundColor: "12AB34" }
      })).toBe(true);
      expect(editor.state.pm.selection).toBeInstanceOf(WordTableSelection);
      vi.advanceTimersByTime(1000);
      expect(editor.commands.setWordTableCellAttrs({
        attrs: { backgroundColor: null }
      })).toBe(true);
      expect(editor.state.pm.selection).toBeInstanceOf(WordTableSelection);

      expect(editor.commands.undo()).toBe(true);
      expect(editor.state.doc.firstChild?.firstChild?.firstChild?.attrs.backgroundColor)
        .toBe("12AB34");
      expect(editor.commands.undo()).toBe(true);
      expect(editor.state.doc.firstChild?.firstChild?.firstChild?.attrs.backgroundColor)
        .toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("word-table-editor-selection-resize preserves the structural selection", () => {
    const editor = createWordTableEditorWithTable(2, 2);

    setWordTableSelection(editor, 0, 3);

    expect(editor.commands.setWordTableColumnWidth({
      tablePos: 0,
      columnIndex: 0,
      width: { value: 1800, unit: "dxa" }
    })).toBe(true);
    expect(editor.state.pm.selection).toBeInstanceOf(WordTableSelection);

    expect(editor.commands.setWordTableRowHeight({
      tablePos: 0,
      rowIndex: 0,
      height: { value: 600, rule: "atLeast" }
    })).toBe(true);
    expect(editor.state.pm.selection).toBeInstanceOf(WordTableSelection);

    const selection = editor.state.pm.selection as WordTableSelection;

    expect(selection.tablePos).toBe(0);
    expect(selection.cells).toHaveLength(4);
  });

  it("word-table-editor-selection-move keeps the moved column selected", () => {
    const editor = createWordTableEditorWithTable(2, 3);

    setWordTableSelection(editor, 1, 4, "column");

    expect(editor.commands.moveWordTableColumns({
      tablePos: 0,
      from: 1,
      targetIndex: 0
    })).toBe(true);

    const selection = editor.state.pm.selection;
    expect(selection).toBeInstanceOf(WordTableSelection);
    expect(selection).toMatchObject({
      mode: "column",
      rect: {
        startRow: 0,
        rowSpan: 2,
        startColumn: 0,
        columnSpan: 1
      }
    });
  });

  it("word-table-editor-selection-delete-columns uses the selected grid range", () => {
    const editor = createWordTableEditorWithTable(1, 3);

    setWordTableSelection(editor, 1, 2);

    expect(editor.commands.deleteWordTableColumns({})).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(1);
  });
});
