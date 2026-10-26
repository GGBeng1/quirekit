import { createEditor, type QuireEditor, type QuireJSONContent } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { ClassicEditorKit } from "../../../extensions";
import { readClassicWordCountSummarizedNodes, summarizeClassicDocumentWords } from "./summary";

/** Paragraph JSON from text pieces; a piece with `bold` carries a mark that splits text nodes. */
const paragraph = (...pieces: (string | { readonly bold: string } | "<br>")[]): QuireJSONContent => ({
  type: "paragraph",
  content: pieces.map(piece => piece === "<br>" ? { type: "hardBreak" }
    : typeof piece === "string" ? { type: "text", text: piece }
      : { type: "text", text: piece.bold, marks: [{ type: "bold" }] })
});

/** Documents covering word joins across marks, breaks, blocks, nesting and Unicode whitespace. */
const documents: Record<string, readonly QuireJSONContent[]> = {
  "word split by a mark": [paragraph("hel", { bold: "lo" }, " world")],
  "break inside a word": [paragraph("ab", "<br>", "cd")],
  "mixed scripts and emoji": [paragraph("你好 🌍 hello world　再见")],
  "padding and empty blocks": [paragraph("  lead"), { type: "paragraph" }, paragraph("trail  "), paragraph("   ")],
  "adjacent blocks": [paragraph("end"), paragraph("start"), { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] }],
  "nested lists and quotes": [
    { type: "bulletList", content: [
      { type: "listItem", content: [paragraph("one"), { type: "bulletList", content: [{ type: "listItem", content: [paragraph("two three")] }] }] }
    ] },
    { type: "blockquote", content: [paragraph("quoted", { bold: "word" })] },
    { type: "horizontalRule" },
    { type: "codeBlock", content: [{ type: "text", text: "const x = 1;" }] }
  ]
};

describe("Classic word-count summaries", () => {
  it.each(Object.keys(documents))("counts exactly as whole-document plain text (%s)", (name) => {
    const editor = createEditor({ extensions: [ClassicEditorKit], content: { type: "doc", content: [...documents[name]!] } });
    const summary = summarizeClassicDocumentWords(editor.state.doc);
    expect(summary.characters).toBe(countPlainText(editor, "characters"));
    expect(summary.runs).toBe(countPlainText(editor, "words"));
    editor.destroy();
  });

  it("summarizes only the edited path of a long document", () => {
    const blocks = Array.from({ length: 500 }, (_, index) => paragraph(`段落 ${index} text`));
    const editor = createEditor({ extensions: [ClassicEditorKit], content: { type: "doc", content: blocks } });
    summarizeClassicDocumentWords(editor.state.doc);

    const before = readClassicWordCountSummarizedNodes();
    let position = 0;
    editor.state.doc.forEach((_node, offset, index) => { if (index === 250) position = offset + 2; });
    editor.commands.setTextSelection(position);
    editor.commands.insertContent("新 words ");
    const summary = summarizeClassicDocumentWords(editor.state.doc);

    expect(readClassicWordCountSummarizedNodes() - before).toBe(2);
    expect(summary.characters).toBe(countPlainText(editor, "characters"));
    expect(summary.runs).toBe(countPlainText(editor, "words"));
    editor.destroy();
  });
});

/**
 * Counts the reference way: whole-document plain text, trimmed.
 *
 * @param editor - Editor whose text is serialized.
 * @param unit - Non-whitespace characters or whitespace-separated words.
 * @returns Reference count.
 */
function countPlainText(editor: QuireEditor, unit: "characters" | "words"): number {
  const text = editor.getText().trim();
  if (unit === "characters") return Array.from(text.replace(/\s/gu, "")).length;
  return text.length === 0 ? 0 : text.split(/\s+/u).length;
}
