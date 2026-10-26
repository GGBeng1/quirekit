import { Schema, type Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { wordTableNodeSpecs } from "../../schema";
import { createWordTableMap } from "../../map";
import { clearWordTableCellContents } from "./clear-cell-contents";
import { deleteWordTable } from "./delete-table";
import {
  addWordTableColumns,
  addWordTableRows
} from "./batch";
import { createWordTableNode } from "../insert";
import type { WordTableCommandResult } from "../types";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    ...wordTableNodeSpecs
  }
});

/**
 * Unwraps a successful pure table command result.
 *
 * @param result - Result to unwrap.
 * @returns Command value.
 */
function unwrap<Value>(result: WordTableCommandResult<Value>): Value {
  if (!result.ok) {
    throw new Error(`Expected command success, got ${result.reason}.`);
  }

  return result.value;
}

/**
 * Creates a two-by-two table with text and direct cell attrs.
 *
 * @returns Parsed Word table node.
 */
function createTextTable(): PMNode {
  return schema.nodeFromJSON({
    type: "wordTable",
    attrs: { alignment: "center" },
    content: [
      {
        type: "wordTableRow",
        content: [
          textCell("A", { verticalAlign: "center" }),
          textCell("B")
        ]
      },
      {
        type: "wordTableRow",
        content: [textCell("C"), textCell("D")]
      }
    ]
  });
}

/**
 * Creates one cell JSON value containing a text paragraph.
 *
 * @param text - Cell text.
 * @param attrs - Optional direct cell attrs.
 * @returns Cell JSON value.
 */
function textCell(
  text: string,
  attrs: Readonly<Record<string, unknown>> = {}
): unknown {
  return {
    type: "wordTableCell",
    attrs,
    content: [{
      type: "paragraph",
      content: [{ type: "text", text }]
    }]
  };
}

describe("Word table compound commands", () => {
  it("adds an accepted row or column count as one pure table result", () => {
    const source = unwrap(createWordTableNode(schema, {
      rowCount: 2,
      columnCount: 2,
      tableAttrs: { alignment: "center" }
    }));

    const withRows = unwrap(addWordTableRows(source, {
      rowIndex: 0,
      side: "after",
      count: 3
    }));
    const withColumns = unwrap(addWordTableColumns(source, {
      columnIndex: 0,
      side: "after",
      count: 3
    }));

    expect(withRows.childCount).toBe(5);
    expect(withRows.attrs.alignment).toBe("center");
    expect(createWordTableMap(withColumns).width).toBe(5);
    expect(withColumns.attrs.alignment).toBe("center");
  });

  it("does not turn a Classic surface density limit into a feature command limit", () => {
    const source = unwrap(createWordTableNode(schema, {
      rowCount: 1,
      columnCount: 1
    }));

    expect(unwrap(addWordTableRows(source, {
      rowIndex: 0,
      side: "after",
      count: 64
    })).childCount).toBe(65);
    expect(createWordTableMap(unwrap(addWordTableColumns(source, {
      columnIndex: 0,
      side: "after",
      count: 64
    }))).width).toBe(65);
  });

  it("rejects non-positive fractional and structurally impossible batch counts", () => {
    const source = unwrap(createWordTableNode(schema, {
      rowCount: 2,
      columnCount: 2
    }));
    const invalidCounts = [
      0,
      -1,
      1.5,
      Number.MAX_SAFE_INTEGER
    ];

    for (const count of invalidCounts) {
      expect(addWordTableRows(source, {
        rowIndex: 0,
        side: "after",
        count
      })).toMatchObject({ ok: false, reason: "invalid-selection" });
      expect(addWordTableColumns(source, {
        columnIndex: 0,
        side: "after",
        count
      })).toMatchObject({ ok: false, reason: "invalid-selection" });
    }
  });

  it("deletes the logical table directly", () => {
    const source = createTextTable();

    expect(unwrap(deleteWordTable(source, {}))).toBeNull();
  });

  it("rejects delete when the supplied node is not a Word table", () => {
    const paragraph = schema.nodes.paragraph?.createAndFill();
    if (!paragraph) throw new Error("Expected paragraph fixture.");

    expect(deleteWordTable(paragraph, {})).toEqual({
      ok: false,
      reason: "no-table"
    });
  });

  it("clears selected cell bodies while preserving topology and attrs", () => {
    const source = createTextTable();
    const result = unwrap(clearWordTableCellContents(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 2
    }));

    expect(result.attrs.alignment).toBe("center");
    expect(result.childCount).toBe(2);
    expect(result.firstChild?.childCount).toBe(2);
    expect(result.firstChild?.firstChild?.attrs.verticalAlign).toBe("center");
    expect(result.firstChild?.firstChild?.textContent).toBe("");
    expect(result.firstChild?.lastChild?.textContent).toBe("");
    expect(result.lastChild?.firstChild?.textContent).toBe("C");
    expect(result.lastChild?.lastChild?.textContent).toBe("D");
  });

  it("returns the same table when selected cell bodies are already empty", () => {
    const source = unwrap(createWordTableNode(schema, {
      rowCount: 1,
      columnCount: 1
    }));

    const result = unwrap(clearWordTableCellContents(source, {
      startRow: 0,
      startColumn: 0,
      rowSpan: 1,
      columnSpan: 1
    }));

    expect(result).toBe(source);
  });
});
