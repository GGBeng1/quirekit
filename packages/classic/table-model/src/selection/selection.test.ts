import {
  EditorState,
  Schema,
  Selection,
  Transform,
  type Node as PMNode
} from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { parseWordTableTsv } from "../clipboard";
import { createWordTableMap } from "../map";
import { wordTableNodeSpecs } from "../schema";
import { WordTableSelection } from "./selection";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    ...wordTableNodeSpecs
  }
});

/**
 * Creates a document with one table and an optional trailing paragraph.
 *
 * @param rows - Table row JSON objects.
 * @param trailingParagraph - Whether to append a paragraph after the table.
 * @returns Parsed ProseMirror document.
 */
function docWithTable(rows: readonly unknown[], trailingParagraph = false): PMNode {
  return schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "wordTable",
        content: rows
      },
      ...(trailingParagraph ? [{ type: "paragraph" }] : [])
    ]
  });
}

/**
 * Creates a row JSON object.
 *
 * @param cells - Cell JSON objects.
 * @returns Row JSON.
 */
function row(cells: readonly unknown[]): unknown {
  return { type: "wordTableRow", content: cells };
}

/**
 * Creates a cell JSON object.
 *
 * @param attrs - Optional cell attrs.
 * @returns Cell JSON.
 */
function cell(attrs: Record<string, unknown> = {}): unknown {
  return {
    type: "wordTableCell",
    attrs,
    content: [{ type: "paragraph" }]
  };
}

/**
 * Creates a cell JSON object containing one text paragraph.
 *
 * @param text - Paragraph text.
 * @returns Cell JSON.
 */
function textCell(text: string): unknown {
  return {
    type: "wordTableCell",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }]
      }
    ]
  };
}

/**
 * Creates a Word table selection around explicit cell indices.
 *
 * @param doc - Source document.
 * @param anchorCellIndex - Anchor explicit cell index.
 * @param headCellIndex - Head explicit cell index.
 * @returns Word table selection.
 */
function selectionBetweenCells(
  doc: PMNode,
  anchorCellIndex: number,
  headCellIndex: number
): WordTableSelection {
  const map = createWordTableMap(doc.child(0));

  return WordTableSelection.create(doc, {
    tablePos: 0,
    anchorCellPos: map.explicitCells[anchorCellIndex]!.cellPos,
    headCellPos: map.explicitCells[headCellIndex]!.cellPos,
    mode: "cell"
  });
}

describe("WordTableSelection", () => {
  it("serializes and restores a structural table selection", () => {
    const doc = docWithTable([
      row([cell(), cell()])
    ]);
    const selection = selectionBetweenCells(doc, 0, 1);
    const roundtrip = Selection.fromJSON(doc, selection.toJSON());

    expect(roundtrip).toBeInstanceOf(WordTableSelection);
    expect(roundtrip.eq(selection)).toBe(true);
    expect(selection.rect).toEqual({
      startRow: 0,
      rowSpan: 1,
      startColumn: 0,
      columnSpan: 2
    });
    expect(selection.cells).toHaveLength(2);
  });

  it("expands partial merged-cell selections to the semantic cell", () => {
    const doc = docWithTable([
      row([cell({ vMerge: "restart", rowspan: 2 })]),
      row([cell({ vMerge: "continue" })])
    ]);
    const selection = selectionBetweenCells(doc, 1, 1);

    expect(selection.rect).toEqual({
      startRow: 0,
      rowSpan: 2,
      startColumn: 0,
      columnSpan: 1
    });
    expect(selection.cells).toHaveLength(1);
  });

  it("maps through insertions before the selected table", () => {
    const doc = docWithTable([
      row([cell(), cell()])
    ]);
    const selection = selectionBetweenCells(doc, 0, 1);
    const paragraph = schema.nodes.paragraph!.create();
    const transform = new Transform(doc).insert(0, paragraph);
    const mapped = selection.map(transform.doc, transform.mapping);

    expect(mapped).toBeInstanceOf(WordTableSelection);
    expect((mapped as WordTableSelection).tablePos).toBe(paragraph.nodeSize);
    expect((mapped as WordTableSelection).rect).toEqual(selection.rect);
  });

  it("falls back when the selected table is deleted", () => {
    const doc = docWithTable([
      row([cell(), cell()])
    ], true);
    const selection = selectionBetweenCells(doc, 0, 1);
    const table = doc.child(0);
    const transform = new Transform(doc).delete(0, table.nodeSize);
    const mapped = selection.map(transform.doc, transform.mapping);

    expect(mapped).not.toBeInstanceOf(WordTableSelection);
  });

  it("returns a copied table slice for clipboard serialization", () => {
    const doc = docWithTable([
      row([cell(), cell()]),
      row([cell(), cell()])
    ]);
    const selection = selectionBetweenCells(doc, 0, 3);
    const slice = selection.content();
    const table = slice.content.firstChild;

    expect(table?.type.name).toBe("wordTable");
    expect(table?.childCount).toBe(2);
    expect(table?.child(0).childCount).toBe(2);
  });

  it("serializes structural slices and plain-text fallbacks for the shared clipboard writer", () => {
    const doc = docWithTable([
      row([cell(), cell()])
    ]);
    const selection = selectionBetweenCells(doc, 0, 1);
    const clipboard = selection.serializeClipboard();

    expect(clipboard.slice.content.firstChild?.type.name).toBe("wordTable");
    expect(clipboard.plainText).toBe("\t");
  });

  it("clears selected cell contents when deleted", () => {
    const doc = docWithTable([
      row([textCell("A"), textCell("B"), textCell("C")])
    ]);
    const selection = selectionBetweenCells(doc, 0, 1);
    const state = EditorState.create({ doc, selection });
    const transaction = state.tr.deleteSelection();
    const table = transaction.doc.child(0);

    expect(table.child(0).child(0).textContent).toBe("");
    expect(table.child(0).child(1).textContent).toBe("");
    expect(table.child(0).child(2).textContent).toBe("C");
    expect(transaction.selection).toBeInstanceOf(WordTableSelection);
  });

  it("pastes a matching table slice into selected cells", () => {
    const doc = docWithTable([
      row([textCell("A"), textCell("B"), textCell("C")])
    ]);
    const selection = selectionBetweenCells(doc, 0, 1);
    const state = EditorState.create({ doc, selection });
    const slice = parseWordTableTsv({ schema, tsv: "X\tY" });
    const transaction = state.tr.replaceSelection(slice);
    const table = transaction.doc.child(0);

    expect(table.child(0).child(0).textContent).toBe("X");
    expect(table.child(0).child(1).textContent).toBe("Y");
    expect(table.child(0).child(2).textContent).toBe("C");
    expect(transaction.selection).toBeInstanceOf(WordTableSelection);
  });
});
