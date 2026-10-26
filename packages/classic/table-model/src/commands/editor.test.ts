import { createEditor, Extension } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { Plugin } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { createWordTableMap } from "../map";
import { WordTableExtensions } from "../schema";
import {
  wordTableRepairTransactionMeta,
  type WordTableRepairReport
} from "./repair";

/**
 * Creates an editor with Word table nodes installed.
 *
 * @returns Test editor instance.
 */
function createWordTableEditor() {
  return createEditor({
    extensions: [...WordTableExtensions]
  });
}

/**
 * Creates an editor whose initial document contains one Word table.
 *
 * @param rowCount - Number of table rows to create.
 * @param columnCount - Number of table columns to create.
 * @returns Test editor instance with undo-redo history installed.
 */
function createWordTableHistoryEditorWithTable(
  rowCount: number,
  columnCount: number
) {
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

describe("Word table editor commands", () => {
  it("preflights readonly and installed transaction filters in can() and run()", () => {
    const content = {
      type: "doc",
      content: [{
        type: "wordTable",
        content: [{
          type: "wordTableRow",
          content: [{
            type: "wordTableCell",
            content: [{ type: "paragraph" }]
          }]
        }]
      }]
    };
    const protectedEditor = createEditor({
      extensions: [...WordTableExtensions, RejectTableMutations],
      content
    });
    const protectedDocument = protectedEditor.getJSON();

    expect(protectedEditor.can().setWordTableRowAttrs({
      tablePos: 0,
      rowIndex: 0,
      attrs: { cantSplit: true }
    })).toBe(false);
    expect(protectedEditor.commands.setWordTableRowAttrs({
      tablePos: 0,
      rowIndex: 0,
      attrs: { cantSplit: true }
    })).toBe(false);
    expect(protectedEditor.getJSON()).toEqual(protectedDocument);

    const readOnlyEditor = createEditor({
      extensions: [...WordTableExtensions],
      content
    });
    readOnlyEditor.setEditable(false);
    const readOnlyDocument = readOnlyEditor.getJSON();
    expect(readOnlyEditor.can().setWordTableRowAttrs({
      tablePos: 0,
      rowIndex: 0,
      attrs: { cantSplit: true }
    })).toBe(false);
    expect(readOnlyEditor.commands.setWordTableRowAttrs({
      tablePos: 0,
      rowIndex: 0,
      attrs: { cantSplit: true }
    })).toBe(false);
    expect(readOnlyEditor.getJSON()).toEqual(readOnlyDocument);
  });

  it("word-table-editor-command-insert-table inserts a table node", () => {
    const editor = createWordTableEditor();

    expect(editor.commands.insertWordTable({
      rowCount: 2,
      columnCount: 2
    })).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("wordTable");
    expect(editor.state.doc.firstChild?.childCount).toBe(2);
    expect(editor.state.pm.selection.from).toBe(4);
    expect(editor.state.pm.selection.$from.parent.type.name).toBe("paragraph");
    expect(editor.state.pm.selection.$from.node(-1).type.name).toBe("wordTableCell");
  });

  it("word-table-editor-command-insert-table is one undoable operation", () => {
    const editor = createEditor({
      extensions: [...WordTableExtensions, UndoRedo]
    });
    const initialDocument = editor.getJSON();

    expect(editor.commands.insertWordTable({
      rowCount: 2,
      columnCount: 2
    })).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("wordTable");

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);

    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("wordTable");
  });

  it("word-table-editor-command-add-row locates the selected table", () => {
    const editor = createWordTableEditor();

    editor.commands.insertWordTable({ rowCount: 1, columnCount: 1 });
    editor.commands.setTextSelection(3);

    expect(editor.commands.addWordTableRow({
      rowIndex: 0,
      side: "after"
    })).toBe(true);
    expect(editor.state.doc.firstChild?.childCount).toBe(2);
  });

  it("word-table-editor-command-add-row selects the inserted row near the active column", () => {
    const editor = createWordTableHistoryEditorWithTable(2, 2);

    setTableCellCursor(editor, 0, 1);

    expect(editor.commands.addWordTableRow({
      tablePos: 0,
      rowIndex: 0,
      side: "after"
    })).toBe(true);
    expect(resolveSelectedTableCell(editor)).toEqual({
      rowIndex: 1,
      columnIndex: 1
    });
  });

  it("word-table-editor-command-add-column selects the inserted column near the active row", () => {
    const editor = createWordTableHistoryEditorWithTable(2, 2);

    setTableCellCursor(editor, 1, 0);

    expect(editor.commands.addWordTableColumn({
      tablePos: 0,
      columnIndex: 0,
      side: "after"
    })).toBe(true);
    expect(resolveSelectedTableCell(editor)).toEqual({
      rowIndex: 1,
      columnIndex: 1
    });
  });

  it("word-table-editor-command-delete-column can delete the table", () => {
    const editor = createWordTableEditor();

    editor.commands.insertWordTable({ rowCount: 1, columnCount: 1 });

    expect(editor.commands.deleteWordTableColumns({
      from: 0,
      tablePos: 0
    })).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
  });

  it("word-table-editor-command-deletes-the-logical-table as one history item", () => {
    const editor = createWordTableHistoryEditorWithTable(2, 2);
    const initialDocument = editor.getJSON();

    expect(editor.can().deleteWordTable({ tablePos: 0 })).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
    expect(editor.commands.deleteWordTable({ tablePos: 0 })).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
  });

  it("word-table-editor-command-clears-cell-contents without changing cell attrs", () => {
    const editor = createEditor({
      extensions: [...WordTableExtensions, UndoRedo],
      content: {
        type: "doc",
        content: [{
          type: "wordTable",
          content: [{
            type: "wordTableRow",
            content: [
              {
                type: "wordTableCell",
                attrs: { verticalAlign: "center" },
                content: [{
                  type: "paragraph",
                  content: [{ type: "text", text: "A" }]
                }]
              },
              {
                type: "wordTableCell",
                content: [{
                  type: "paragraph",
                  content: [{ type: "text", text: "B" }]
                }]
              }
            ]
          }]
        }]
      }
    });
    const initialDocument = editor.getJSON();

    expect(editor.commands.setWordTableSelection({
      tablePos: 0,
      anchorCellPos: 2,
      headCellPos: 2,
      mode: "cell"
    })).toBe(true);
    expect(editor.can().clearWordTableCellContents()).toBe(true);
    expect(editor.commands.clearWordTableCellContents()).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.firstChild?.textContent).toBe("");
    expect(
      editor.state.doc.firstChild?.firstChild?.firstChild?.attrs.verticalAlign
    ).toBe("center");
    expect(editor.state.doc.firstChild?.firstChild?.lastChild?.textContent).toBe("B");

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
  });

  it("word-table-editor-command-merge-and-split applies table transforms", () => {
    const editor = createWordTableEditor();

    editor.commands.insertWordTable({ rowCount: 1, columnCount: 2 });

    expect(editor.commands.mergeWordTableCells({
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 2,
      tablePos: 0
    })).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(1);

    expect(editor.commands.splitWordTableCell({
      rowIndex: 0,
      columnIndex: 0,
      tablePos: 0
    })).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(2);
  });

  it("word-table-editor-command-distribute-columns applies grid widths", () => {
    const editor = createWordTableEditor();

    editor.commands.insertWordTable({ rowCount: 1, columnCount: 3 });

    expect(editor.commands.distributeWordTableColumns({
      from: 0,
      to: 2,
      tablePos: 0,
      totalWidth: { value: 6000, unit: "dxa" }
    })).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.grid).toEqual([
      { width: { value: 2000, unit: "dxa" } },
      { width: { value: 2000, unit: "dxa" } },
      { width: { value: 2000, unit: "dxa" } }
    ]);
  });

  it("word-table-editor-command-distribute-rows applies row heights", () => {
    const editor = createWordTableEditor();

    editor.commands.insertWordTable({ rowCount: 3, columnCount: 1 });

    expect(editor.commands.distributeWordTableRows({
      from: 0,
      to: 2,
      tablePos: 0,
      totalHeight: { value: 900, rule: "exact" }
    })).toBe(true);
    expect(editor.state.doc.firstChild?.child(0).attrs.height).toEqual({
      value: 300,
      rule: "exact"
    });
    expect(editor.state.doc.firstChild?.child(1).attrs.height).toEqual({
      value: 300,
      rule: "exact"
    });
    expect(editor.state.doc.firstChild?.child(2).attrs.height).toEqual({
      value: 300,
      rule: "exact"
    });
  });

  it("word-table-editor-command-resize applies one column width and row height", () => {
    const editor = createWordTableEditor();

    editor.commands.insertWordTable({ rowCount: 2, columnCount: 2 });

    expect(editor.commands.setWordTableColumnWidth({
      tablePos: 0,
      columnIndex: 1,
      width: { value: 1800, unit: "dxa" }
    })).toBe(true);
    expect(editor.commands.setWordTableRowHeight({
      tablePos: 0,
      rowIndex: 1,
      height: { value: 600, rule: "atLeast" }
    })).toBe(true);

    expect(editor.state.doc.firstChild?.attrs.grid).toEqual([
      { width: null },
      { width: { value: 1800, unit: "dxa" } }
    ]);
    expect(editor.state.doc.firstChild?.child(1).attrs.height).toEqual({
      value: 600,
      rule: "atLeast"
    });
  });

  it("word-table-editor-command-set-cell-attrs applies cell formatting", () => {
    const editor = createWordTableEditor();

    editor.commands.insertWordTable({ rowCount: 1, columnCount: 1 });

    expect(editor.commands.setWordTableCellAttrs({
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1,
      tablePos: 0,
      attrs: {
        shading: { fill: "D9EAF7", color: null, pattern: "clear" }
      }
    })).toBe(true);
    expect(
      editor.state.doc.firstChild?.firstChild?.firstChild?.attrs.shading
    ).toEqual({ fill: "D9EAF7", color: null, pattern: "clear" });

    expect(editor.commands.clearWordTableCellFormatting({
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1,
      tablePos: 0
    })).toBe(true);
    expect(
      editor.state.doc.firstChild?.firstChild?.firstChild?.attrs.shading
    ).toBeNull();
  });

  it("word-table-editor-command-updates-table-alignment and cell borders", () => {
    const editor = createWordTableEditor();
    editor.commands.insertWordTable({ rowCount: 1, columnCount: 1 });

    expect(editor.commands.setWordTableAttrs({
      tablePos: 0,
      attrs: { alignment: "center" }
    })).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.alignment).toBe("center");

    expect(editor.commands.setWordTableCellBorders({
      tablePos: 0,
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1,
      preset: "bottom",
      border: {
        style: "single",
        size: 8,
        color: "auto",
        space: 0,
        shadow: false,
        frame: false
      }
    })).toBe(true);
    expect(
      editor.state.doc.firstChild?.firstChild?.firstChild?.attrs.borders.bottom
    ).toMatchObject({ style: "single", color: "auto" });
  });

  it("word-table-editor-command-history-restores-table-transforms", () => {
    const editor = createWordTableHistoryEditorWithTable(1, 2);

    expect(editor.commands.addWordTableColumn({
      columnIndex: 1,
      side: "after",
      tablePos: 0
    })).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(3);

    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(2);

    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(3);
  });

  it("word-table-editor-command-batch-rows-and-columns are atomic history items", () => {
    const editor = createWordTableHistoryEditorWithTable(2, 2);
    const initialDocument = editor.getJSON();

    expect(editor.can().addWordTableRows({
      tablePos: 0,
      rowIndex: 0,
      side: "after",
      count: 3
    })).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
    expect(editor.commands.addWordTableRows({
      tablePos: 0,
      rowIndex: 0,
      side: "after",
      count: 3
    })).toBe(true);
    expect(editor.state.doc.firstChild?.childCount).toBe(5);

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);

    expect(editor.commands.addWordTableColumns({
      tablePos: 0,
      columnIndex: 0,
      side: "after",
      count: 3
    })).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(5);

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
  });

  it("word-table-editor-command-batch-rows-and-columns support chain and reject invalid counts", () => {
    const editor = createWordTableHistoryEditorWithTable(1, 1);
    const initialDocument = editor.getJSON();

    expect(editor.can().addWordTableRows({
      tablePos: 0,
      rowIndex: 0,
      side: "after",
      count: 0
    })).toBe(false);
    expect(editor.commands.addWordTableColumns({
      tablePos: 0,
      columnIndex: 0,
      side: "after",
      count: Number.MAX_SAFE_INTEGER
    })).toBe(false);
    expect(editor.getJSON()).toEqual(initialDocument);

    expect(editor.chain().addWordTableRows({
      tablePos: 0,
      rowIndex: 0,
      side: "after",
      count: 2
    }).addWordTableColumns({
      tablePos: 0,
      columnIndex: 0,
      side: "after",
      count: 2
    }).run()).toBe(true);
    expect(editor.state.doc.firstChild?.childCount).toBe(3);
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(3);

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
  });

  it("word-table-editor-command-publishes-safe-repair-diagnostics", () => {
    let repairReport: WordTableRepairReport | undefined;
    const editor = createEditor({
      extensions: [...WordTableExtensions],
      content: {
        type: "doc",
        content: [{
          type: "wordTable",
          attrs: { grid: [{ width: null }, { width: null }] },
          content: [{
            type: "wordTableRow",
            content: [{
              type: "wordTableCell",
              attrs: { colspan: 1, gridSpan: 2 },
              content: [{ type: "paragraph" }]
            }]
          }]
        }]
      },
      onTransaction({ transaction }) {
        repairReport = transaction.getMeta(wordTableRepairTransactionMeta) as
          WordTableRepairReport | undefined;
      }
    });

    expect(editor.commands.addWordTableColumn({
      columnIndex: 0,
      side: "after",
      tablePos: 0
    })).toBe(true);
    expect(repairReport?.applied.map((item) => item.code)).toContain(
      "grid-span-colspan-mismatch"
    );
    expect(editor.state.doc.firstChild?.firstChild?.firstChild?.attrs).toMatchObject({
      colspan: 3,
      gridSpan: 3
    });
  });

  it("word-table-editor-command-explicitly-repairs-malformed-import", () => {
    const editor = createEditor({
      extensions: [...WordTableExtensions],
      content: {
        type: "doc",
        content: [{
          type: "wordTable",
          attrs: { grid: [{ width: null }] },
          content: [{
            type: "wordTableRow",
            content: [{
              type: "wordTableCell",
              attrs: { colspan: 2, gridSpan: 2 },
              content: [{ type: "paragraph" }]
            }]
          }]
        }]
      }
    });

    expect(editor.commands.repairWordTable({
      tablePos: 0,
      mode: "explicit",
      overflow: "expand-grid",
      malformedContinuation: "restart"
    })).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.grid).toHaveLength(2);
  });
});

/** Test-only host lock rejecting every document-changing transaction. */
const RejectTableMutations = Extension.create({
  name: "rejectTableMutations",

  /** @returns A transaction filter that permits selection-only work. */
  addProseMirrorPlugins() {
    return [new Plugin({
      filterTransaction: transaction => !transaction.docChanged
    })];
  }
});

/**
 * Places an ordinary text cursor inside one semantic Table cell.
 *
 * @param editor - Table-capable editor fixture.
 * @param rowIndex - Zero-based source row.
 * @param columnIndex - Zero-based grid column.
 */
function setTableCellCursor(
  editor: ReturnType<typeof createWordTableEditor>,
  rowIndex: number,
  columnIndex: number
): void {
  const table = editor.state.doc.firstChild;
  const cell = table === null
    ? null
    : createWordTableMap(table).cellAt(rowIndex, columnIndex);
  if (cell === null) {
    throw new RangeError("Expected a semantic Table cell.");
  }
  editor.commands.setTextSelection(cell.originCellPos + 2);
}

/**
 * Resolves the current text selection to its semantic Table coordinate.
 *
 * @param editor - Table-capable editor fixture.
 * @returns Selected row and column, or null when the caret left the Table.
 */
function resolveSelectedTableCell(
  editor: ReturnType<typeof createWordTableEditor>
): { readonly rowIndex: number; readonly columnIndex: number } | null {
  const table = editor.state.doc.firstChild;
  if (table === null) {
    return null;
  }
  const selectionPosition = editor.state.pm.selection.from;
  const map = createWordTableMap(table);
  for (let rowIndex = 0; rowIndex < map.height; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < map.width; columnIndex += 1) {
      const cell = map.cellAt(rowIndex, columnIndex);
      if (cell === null) {
        continue;
      }
      const cellNode = editor.state.doc.nodeAt(cell.originCellPos);
      if (
        cellNode !== null
        && selectionPosition > cell.originCellPos
        && selectionPosition < cell.originCellPos + cellNode.nodeSize
      ) {
        return { rowIndex, columnIndex };
      }
    }
  }

  return null;
}
