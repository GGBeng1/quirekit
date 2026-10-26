import { createEditor } from "@quirekit/core";
import type { EditorView, Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { WordTableExtensions } from "../schema";
import { WordTableSelection } from "../selection";
import { selectWordTableCellFromTripleClick } from "./triple-click";

/**
 * Creates one editor containing a two-cell Table.
 *
 * @param editable - Whether the mounted View accepts editing.
 * @returns Editor used by triple-click tests.
 */
function createTableEditor(editable = true) {
  return createEditor({
    editable,
    extensions: [...WordTableExtensions],
    content: {
      type: "doc",
      content: [{
        type: "wordTable",
        content: [{
          type: "wordTableRow",
          content: [
            {
              type: "wordTableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }]
            },
            {
              type: "wordTableCell",
              content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }]
            }
          ]
        }]
      }]
    }
  });
}

/**
 * Finds one cell node and its absolute before-position.
 *
 * @param document - ProseMirror document to inspect.
 * @param index - Zero-based cell index in traversal order.
 * @returns Cell node and absolute position.
 */
function findCell(
  document: PMNode,
  index: number
): { readonly node: PMNode; readonly pos: number } {
  const cells: Array<{ node: PMNode; pos: number }> = [];
  document.descendants((node, pos) => {
    if (node.type.name === "wordTableCell") {
      cells.push({ node, pos });
    }
  });
  const cell = cells[index];
  if (!cell) throw new RangeError(`Missing test cell ${index}`);
  return cell;
}

describe("Word Table triple-click interaction", () => {
  it("selects exactly the triple-clicked semantic cell", () => {
    const editor = createTableEditor();
    const secondCell = findCell(editor.state.doc, 1);

    expect(selectWordTableCellFromTripleClick(
      editor,
      editor.view as unknown as EditorView,
      secondCell.node,
      secondCell.pos
    )).toBe(true);
    expect(editor.state.pm.selection).toBeInstanceOf(WordTableSelection);
    expect(editor.state.pm.selection).toMatchObject({
      mode: "cell",
      rect: {
        startRow: 0,
        rowSpan: 1,
        startColumn: 1,
        columnSpan: 1
      }
    });
  });

  it("falls through for inner text nodes and read-only views", () => {
    const editor = createTableEditor(false);
    const firstCell = findCell(editor.state.doc, 0);
    const paragraph = firstCell.node.firstChild!;

    expect(selectWordTableCellFromTripleClick(
      editor,
      editor.view as unknown as EditorView,
      paragraph,
      firstCell.pos + 1
    )).toBe(false);
    expect(selectWordTableCellFromTripleClick(
      editor,
      editor.view as unknown as EditorView,
      firstCell.node,
      firstCell.pos
    )).toBe(false);
  });
});
