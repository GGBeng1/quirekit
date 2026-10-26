import type { QuireJSONContent } from "@quirekit/core";
import { createEditor } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { describe, expect, it } from "vitest";
import { WordTableExtensions } from "../../schema";
import {
  wordTableMatrixPasteTransactionMeta,
  type WordTableMatrixPasteReport
} from "../matrix";

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
 * Creates an editor containing one canonical one-cell Word table.
 *
 * @param onTransaction - Optional transaction observer.
 * @returns Table-capable editor.
 */
function createTableEditor(
  onTransaction?: (report: WordTableMatrixPasteReport | undefined) => void
) {
  return createEditor({
    extensions: [...WordTableExtensions, UndoRedo],
    content: {
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
    },
    ...(onTransaction === undefined ? {} : {
      onTransaction: ({ transaction }) => onTransaction(
        transaction.getMeta(wordTableMatrixPasteTransactionMeta) as
          WordTableMatrixPasteReport | undefined
      )
    })
  });
}

describe("Word table matrix editor command", () => {
  it("fills with diagnostics on the same atomic transaction", () => {
    const reports: WordTableMatrixPasteReport[] = [];
    const editor = createTableEditor((report) => {
      if (report) reports.push(report);
    });
    const initialDocument = editor.getJSON();

    expect(editor.can().pasteWordTableMatrix({
      strategy: "fill",
      tablePos: 0,
      startRow: 0,
      startColumn: 0,
      matrix: [[body("filled")]],
      lossDiagnostics: [{ code: "source-formatting-not-represented" }]
    })).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
    expect(editor.commands.pasteWordTableMatrix({
      strategy: "fill",
      tablePos: 0,
      startRow: 0,
      startColumn: 0,
      matrix: [[body("filled")]],
      lossDiagnostics: [{ code: "source-formatting-not-represented" }]
    })).toBe(true);
    expect(editor.state.doc.firstChild?.textContent).toBe("filled");
    expect(reports).toEqual([expect.objectContaining({
      strategy: "fill",
      sourceRowCount: 1,
      sourceColumnCount: 1,
      resultRowCount: 1,
      resultColumnCount: 1,
      lossDiagnostics: [{ code: "source-formatting-not-represented" }]
    })]);

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
  });

  it("expands through commands and reverts with one Undo", () => {
    const editor = createTableEditor();
    const initialDocument = editor.getJSON();

    expect(editor.commands.pasteWordTableMatrix({
      strategy: "expand",
      tablePos: 0,
      startRow: 0,
      startColumn: 0,
      matrix: [[body("A"), body("B")], [body("C"), body("D")]]
    })).toBe(true);
    expect(editor.state.doc.firstChild).toMatchObject({ childCount: 2 });
    expect(editor.state.doc.firstChild?.firstChild?.childCount).toBe(2);

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
  });

  it("inserts an exact matrix through chain and one Undo", () => {
    const editor = createEditor({
      extensions: [...WordTableExtensions, UndoRedo]
    });
    const initialDocument = editor.getJSON();

    expect(editor.chain().pasteWordTableMatrix({
      strategy: "insert",
      matrix: [[body("A"), body("B")]]
    }).run()).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("wordTable");
    expect(editor.state.doc.firstChild?.textContent).toBe("AB");

    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(initialDocument);
  });

  it("does not dispatch no-op invalid or stale matrix requests", () => {
    let transactionCount = 0;
    const editor = createTableEditor(() => {
      transactionCount += 1;
    });
    const initialDocument = editor.getJSON();

    expect(editor.commands.pasteWordTableMatrix({
      strategy: "fill",
      tablePos: 0,
      startRow: 0,
      startColumn: 0,
      matrix: [[body()]]
    })).toBe(true);
    expect(editor.commands.pasteWordTableMatrix({
      strategy: "fill",
      tablePos: 99,
      startRow: 0,
      startColumn: 0,
      matrix: [[body("stale")]]
    })).toBe(false);
    expect(editor.commands.pasteWordTableMatrix({
      strategy: "fill",
      tablePos: 0,
      startRow: 0,
      startColumn: 0,
      matrix: [[body("A")], [body("B"), body("C")]]
    })).toBe(false);

    expect(transactionCount).toBe(0);
    expect(editor.getJSON()).toEqual(initialDocument);
  });
});
