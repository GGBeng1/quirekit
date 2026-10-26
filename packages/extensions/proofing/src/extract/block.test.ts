// @vitest-environment happy-dom

import type { Node as PMNode } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { createProofingEditor, paragraph, text } from "../test-support";
import type { ProofingDocumentPolicy } from "../types";
import { extractProofingBlock } from "./block";
import { mapSegmentRange } from "./offsets";

/**
 * Extracts the first textblock of a one-paragraph document.
 *
 * @param doc - Document.
 * @param policy - Document policy.
 * @param excluded - Excluded intervals.
 * @returns Extracted block.
 */
function extractFirst(doc: PMNode, policy: ProofingDocumentPolicy | null = null, excluded = [] as { from: number; to: number }[]) {
  return extractProofingBlock({ doc, node: doc.firstChild!, pos: 0 }, policy, excluded);
}

describe("extractProofingBlock", () => {
  it("joins text across marks and maps every offset back to the document", () => {
    const editor = createProofingEditor([paragraph(text("ab"), text("cd", ["bold"]))], { enabled: false });
    const block = extractFirst(editor.state.pm.doc);

    expect(block.segments.map((segment) => segment.text)).toEqual(["abcd"]);
    expect(mapSegmentRange(block.segments[0]!, 1, 3)).toEqual({ from: 2, to: 4 });
  });

  it("turns inline leaves into one word boundary that maps nowhere", () => {
    const editor = createProofingEditor([paragraph(text("ab"), { type: "hardBreak" }, text("cd"))], { enabled: false });
    const segment = extractFirst(editor.state.pm.doc).segments[0]!;

    expect(segment.text).toBe("ab cd");
    expect(mapSegmentRange(segment, 2, 3)).toBeNull();
    expect(mapSegmentRange(segment, 3, 5)).toEqual({ from: 4, to: 6 });
  });

  it("omits transparent text without breaking the word and skips excluded text", () => {
    const editor = createProofingEditor([paragraph(text("he"), text("XX", ["italic"]), text("llo"), text(" field"))], { enabled: false });
    const policy: ProofingDocumentPolicy = {
      inlineRole: (node) => node.marks.some((mark) => mark.type.name === "italic") ? "transparent" : "check"
    };
    const block = extractFirst(editor.state.pm.doc, policy, [{ from: 8, to: 14 }]);

    expect(block.segments.map((segment) => segment.text)).toEqual(["hello "]);
  });

  it("splits segments by script slot language and leaves East Asian text without a language unchecked", () => {
    const editor = createProofingEditor([paragraph(text("Hello 世界 שלום world"))], { enabled: false });
    const policy: ProofingDocumentPolicy = {
      languages: () => ({ latin: "en-US", complexScript: "he-IL" })
    };
    const segments = extractFirst(editor.state.pm.doc, policy).segments;

    expect(segments.map((segment) => [segment.language, segment.text])).toEqual([
      ["en-US", "Hello  "],
      ["he-IL", "שלום "],
      ["en-US", "world"]
    ]);
  });

  it("treats East Asian punctuation as East Asian text", () => {
    const editor = createProofingEditor([paragraph(text("使用 QuireKit，编辑、导出"))], { enabled: false });
    const segments = extractFirst(editor.state.pm.doc, { languages: () => ({ latin: "en-US" }) }).segments;

    expect(segments.map((segment) => segment.text)).toEqual(["QuireKit "]);
  });

  it("checks East Asian text in its own language when one is set", () => {
    const editor = createProofingEditor([paragraph(text("测试 test"))], { enabled: false });
    const segments = extractFirst(editor.state.pm.doc, { languages: () => ({ latin: "en-US", eastAsia: "zh-CN" }) }).segments;

    expect(segments.map((segment) => segment.language)).toEqual(["zh-CN", "en-US"]);
  });

  it("never checks code blocks or code-marked text", () => {
    const editor = createProofingEditor([
      paragraph(text("teh "), text("cnst", ["code"]), text(" end")),
      { type: "codeBlock", content: [text("cnst teh")] }
    ], { enabled: false });
    const doc = editor.state.pm.doc;

    expect(extractFirst(doc).segments.map((segment) => segment.text)).toEqual(["teh  end"]);
    expect(extractProofingBlock({ doc, node: doc.child(1), pos: doc.child(0).nodeSize }, null, []).surface).toBeNull();
  });

  it("skips blocks the policy excludes", () => {
    const editor = createProofingEditor([paragraph(text("teh"))], { enabled: false });
    const block = extractFirst(editor.state.pm.doc, { blockSurface: () => null });

    expect(block.surface).toBeNull();
    expect(block.segments).toEqual([]);
  });
});
