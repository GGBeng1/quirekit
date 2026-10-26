import { createEditor, Mark } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createQuireMarkStyleResolver } from "../font";
import { resolveQuireTextblockShapingSource } from "./source";

describe("immutable mark occurrence context", () => {
  it("passes the textblock and captured document through shared shaping without reading live selection", () => {
    const seen: unknown[] = [];
    const Accent = Mark.create({ name: "accent", canvasStyle(_mark, context) {
      seen.push(context);
      return { color: context?.contentStart === 1 ? "#334455" : "#556677" };
    } });
    const editor = createEditor({ extensions: [StarterKit, Accent], content: { type: "doc", content: [1, 2].map(() => ({
      type: "paragraph", content: [{ type: "text", text: "same", marks: [{ type: "accent" }] }]
    })) } });
    try {
      const document = editor.state.doc, resolve = createQuireMarkStyleResolver(editor.state);
      const first = document.firstChild!, second = document.lastChild!;
      expect(first.firstChild!.marks[0]).toBe(second.firstChild!.marks[0]);
      for (const [node, contentStart, color] of [[first, 1, "#334455"], [second, 7, "#556677"]] as const) {
        const source = resolveQuireTextblockShapingSource({ node, contentStart, contentEnd: contentStart + 4,
          sourceId: String(contentStart), font: "16px Arial", lineHeight: 24, textBaselineOffset: 18, resolveMarkQuireStyle: resolve });
        expect(source.runs[0]?.color).toBe(color);
        expect(seen).toContainEqual(expect.objectContaining({ node, contentStart, document }));
      }
    } finally { editor.destroy(); }
  });
});
