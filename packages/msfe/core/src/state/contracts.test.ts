import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { describe, expect, it } from "vitest";
import { readMarkdownInput, writeMarkdown } from "./source";
import { buildCommandTransaction, toggleDelimiter } from "../commands/transaction";
import { compileExtensions } from "../extensions/compile";

describe("MSFE source contracts", () => {
  it("restores BOM and homogeneous CRLF without counting them as document offsets", () => {
    const source = "\ufeff# 中文 😀\r\n\r\n  **text**  \r\n";
    const input = readMarkdownInput(source);
    const state = EditorState.create({ doc: input.text });
    expect(state.doc.line(2).from).toBe(8);
    expect(writeMarkdown(state.doc, input)).toBe(source);
  });

  it("rejects ambiguous line endings before accepting a document", () => {
    expect(() => readMarkdownInput("a\r\nb\nc")).toThrow(/mixed-line-endings/);
    expect(() => readMarkdownInput("a\rb")).toThrow(/unsupported-line-ending/);
    expect(readMarkdownInput("a\nb").lineEnding).toBe("\n");
  });
});

describe("atomic source commands", () => {
  it("preserves reverse and multiple selections in one transaction", () => {
    const state = EditorState.create({
      doc: "alpha beta",
      selection: EditorSelection.create([EditorSelection.range(5, 0), EditorSelection.range(6, 10)]),
      extensions: EditorState.allowMultipleSelections.of(true),
    });
    const transaction = buildCommandTransaction(state, [toggleDelimiter("**")]);
    expect(transaction?.newDoc.toString()).toBe("**alpha** **beta**");
    expect(transaction?.newSelection.ranges[0]?.anchor).toBe(7);
    expect(transaction?.newSelection.ranges[0]?.head).toBe(2);
    expect(state.doc.toString()).toBe("alpha beta");
  });

  it("evaluates later commands against earlier changes and rejects the whole failing chain", () => {
    const state = EditorState.create({ doc: "word", selection: { anchor: 0, head: 4 } });
    const transaction = buildCommandTransaction(state, [toggleDelimiter("**"), toggleDelimiter("*")]);
    expect(transaction?.newDoc.toString()).toBe("***word***");
    expect(buildCommandTransaction(state, [toggleDelimiter("**"), () => null])).toBeNull();
    expect(state.doc.toString()).toBe("word");
  });

  it("rejects readonly command writes", () => {
    const state = EditorState.create({ doc: "word", extensions: EditorState.readOnly.of(true) });
    expect(buildCommandTransaction(state, [toggleDelimiter("**")])).toBeNull();
  });
});

describe("extension ownership", () => {
  it("diagnoses duplicates and missing dependencies before mounting", () => {
    expect(() => compileExtensions([{ id: "x" }, { id: "x" }])).toThrow(/duplicate-extension/);
    expect(() => compileExtensions([{ id: "x", requires: ["missing"] }])).toThrow(/missing-dependency/);
    expect(() => compileExtensions([
      { id: "x", projections: [{ nodes: ["StrongEmphasis"], decorate: () => [] }] },
      { id: "y", projections: [{ nodes: ["StrongEmphasis"], decorate: () => [] }] },
    ])).toThrow(/duplicate-projection-owner/);
  });
});
