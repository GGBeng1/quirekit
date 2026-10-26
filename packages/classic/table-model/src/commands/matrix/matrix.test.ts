import type { QuireJSONContent } from "@quirekit/core";
import { Schema, type Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { createWordTableMap } from "../../map";
import { wordTableNodeSpecs } from "../../schema";
import { createWordTableNode } from "../insert";
import type { WordTableCommandResult } from "../types";
import { pasteWordTableMatrixIntoTable } from "./transform";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: { group: "block", content: "inline*" },
    ...wordTableNodeSpecs
  }
});

/**
 * Unwraps a successful pure command result.
 *
 * @param result - Result to unwrap.
 * @returns Command value.
 */
function unwrap<Value>(result: WordTableCommandResult<Value>): Value {
  if (!result.ok) throw new Error(`Expected success, got ${result.reason}.`);
  return result.value;
}

/**
 * Creates one paragraph body for a matrix cell.
 *
 * @param text - Optional paragraph text.
 * @returns Cell body JSON.
 */
function body(text = ""): readonly QuireJSONContent[] {
  return [{
    type: "paragraph",
    ...(text === "" ? {} : {
      content: [{ type: "text", text }]
    })
  }];
}

/**
 * Creates one canonical table fixture.
 *
 * @param rows - Row-major plain text.
 * @returns Word table node.
 */
function table(rows: readonly (readonly string[])[]): PMNode {
  return unwrap(createWordTableNode(schema, {
    rowCount: rows.length,
    columnCount: rows[0]?.length ?? 0,
    tableAttrs: { alignment: "center" },
    cellContents: rows.flatMap((row) => row.map((text) => body(text)))
  }));
}

describe("Word table matrix transforms", () => {
  it("fills a fitting matrix without changing target attrs or topology", () => {
    const source = table([["old-a", "old-b"], ["old-c", "old-d"]]);
    const firstCell = source.firstChild?.firstChild;
    if (!firstCell) throw new Error("Expected first cell.");
    const withCellAttr = source.copy(source.content.replaceChild(
      0,
      source.firstChild!.copy(source.firstChild!.content.replaceChild(
        0,
        firstCell.type.create({
          ...firstCell.attrs,
          verticalAlign: "center"
        }, firstCell.content)
      ))
    ));

    const result = unwrap(pasteWordTableMatrixIntoTable(withCellAttr, {
      strategy: "fill",
      startRow: 0,
      startColumn: 0,
      matrix: [[body("A"), body("B")], [body("C"), body("D")]]
    }));

    expect(result.attrs.alignment).toBe("center");
    expect(result.firstChild?.firstChild?.attrs.verticalAlign).toBe("center");
    expect(result.children.flatMap((row) =>
      row.children.map((cell) => cell.textContent)
    )).toEqual(["A", "B", "C", "D"]);
    expect(createWordTableMap(result)).toMatchObject({ width: 2, height: 2 });
  });

  it("rejects fill overflow instead of truncating matrix cells", () => {
    const source = table([["old"]]);

    expect(pasteWordTableMatrixIntoTable(source, {
      strategy: "fill",
      startRow: 0,
      startColumn: 0,
      matrix: [[body("A"), body("B")]]
    })).toMatchObject({ ok: false, reason: "invalid-selection" });
  });

  it("expands bottom and right before filling the complete matrix", () => {
    const source = table([["A", "B"], ["C", "D"]]);
    const result = unwrap(pasteWordTableMatrixIntoTable(source, {
      strategy: "expand",
      startRow: 1,
      startColumn: 1,
      matrix: [[body("x"), body("y")], [body("z"), body("w")]]
    }));
    const map = createWordTableMap(result);

    expect(map).toMatchObject({ width: 3, height: 3 });
    expect(map.cellAt(1, 1)).not.toBeNull();
    expect(result.children.flatMap((row) =>
      row.children.map((cell) => cell.textContent)
    )).toEqual(["A", "B", "", "C", "x", "y", "", "z", "w"]);
  });

  it("returns the original table for a lossless no-op fill", () => {
    const source = table([["same"]]);

    expect(unwrap(pasteWordTableMatrixIntoTable(source, {
      strategy: "fill",
      startRow: 0,
      startColumn: 0,
      matrix: [[body("same")]]
    }))).toBe(source);
  });
});
