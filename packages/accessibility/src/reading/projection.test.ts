import { createEditor, type QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { accessibilityDefaults } from "../defaults";
import { projectReadingSegment } from "./projection";
import { compileAccessibilityRegistry } from "../registry/registry";

/** @param editor - Test editor. @returns Actual compiled contributors. */
function registry(editor: QuireEditor) { return compileAccessibilityRegistry(editor.state.extensions, editor.state.schema); }

describe("explicit bounded reading segments", () => {
  it("covers every character across offscreen blocks and long paragraphs exactly once", () => {
    const texts = ["x".repeat(31), "😀".repeat(80), "éעברית".repeat(18), "last"];
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: texts.map((text, index) => ({
      type: index === 0 ? "heading" : "paragraph", ...(index === 0 ? { attrs: { level: 2 } } : {}), content: [{ type: "text", text }]
    })) } });
    const options = { ...accessibilityDefaults, readingBudget: 32, readingBlocks: 2 };
    let cursor: number | null = 0;
    let text = "";
    let count = 0;
    while (cursor !== null && count++ < 100) {
      const result = projectReadingSegment(editor.state.doc, cursor, options, registry(editor));
      if (count === 1) expect(result.items[0]?.description).toEqual({ kind: "heading", level: 2, editable: true });
      expect(result.items.length).toBeLessThanOrEqual(2);
      expect(result.items.reduce((sum, item) => sum + item.text.length, 0)).toBeLessThanOrEqual(32);
      text += result.items.map((item) => item.text).join("");
      expect(result.next === null || result.next > cursor).toBe(true);
      cursor = result.next;
    }
    expect(cursor).toBeNull();
    expect(text).toBe(texts.join(""));
    editor.destroy();
  });

  it("preserves contributed container ancestry without a central node-name switch", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
      { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }] },
      { type: "paragraph", content: [{ type: "text", text: "tail" }] }
    ] } });
    const segment = projectReadingSegment(editor.state.doc, 0, accessibilityDefaults, registry(editor));
    expect(segment.items[0]?.text).toBe("nested");
    expect(segment.items[0]?.ancestors[0]?.description.kind).toBe("blockquote");
    expect(segment.items[0]?.editable).toBe(true);
    expect(segment.items[1]?.text).toBe("tail");
    editor.destroy();
  });
});
