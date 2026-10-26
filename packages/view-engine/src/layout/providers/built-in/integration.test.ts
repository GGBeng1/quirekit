import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { buildQuireLayoutSnapshot } from "../../../editor-layout";
import type { QuireTextMeasurer } from "@quirekit/layout/text";

const fixedMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: text.length * 10 })
};

describe("built-in layout provider consumers", () => {
  it("installs recursive blockquote child flow through provider authority", () => {
    const editor = createBlockquoteEditor(["One", "Two"]);
    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 10, y: 20, width: 300, height: 200 },
      textMeasurer: fixedMeasurer
    });
    const quote = snapshot.root.children?.[0];

    expect(quote).toMatchObject({
      id: "blockquote-0",
      viewRoot: {
        id: { value: expect.stringContaining("recursive-child-flow") }
      },
      viewRegion: {
        regionId: { value: expect.stringContaining("recursive-child-flow") }
      }
    });
    expect(quote?.children?.map((child) => child.textFragments?.[0]?.text))
      .toEqual(["One", "Two"]);
    expect(snapshot.regionSelectionPolicies).toEqual([
      expect.objectContaining({ kind: "delegate-to-text" })
    ]);
    expect(snapshot.consumerCompilation.kind).toBe("ready");
    if (snapshot.consumerCompilation.kind !== "ready") {
      throw new Error("Expected blockquote consumer products to compile.");
    }
    expect(Object.values(snapshot.consumerCompilation.descriptorsByOwner))
      .toContainEqual(expect.objectContaining({
        semantics: {
          role: "blockquote",
          search: { kind: "source-text" }
        },
        exportFallbacks: [expect.objectContaining({
          kind: "native",
          targetFormat: "html"
        })]
      }));
  });

  it("preserves one provider root while recursive blockquote children paginate", () => {
    const editor = createBlockquoteEditor([
      "One line that wraps across the narrow recursive container.",
      "Two line that also wraps across the narrow recursive container.",
      "Three line that keeps the provider contribution flowing."
    ]);
    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 10, y: 20, width: 300, height: 240 },
      textMeasurer: fixedMeasurer,
      pageGeometry: {
        pageRect: { x: 10, y: 20, width: 300, height: 80 },
        bodyRect: { x: 20, y: 30, width: 120, height: 40 }
      }
    });
    const quoteFragments = snapshot.root.children?.filter((node) =>
      node.id.startsWith("blockquote-0")
    ) ?? [];
    const rootIds = new Set(
      quoteFragments.map((fragment) => fragment.viewRoot?.id.value)
    );
    const quoteDescriptors = snapshot.consumerCompilation.kind === "ready"
      ? Object.values(snapshot.consumerCompilation.descriptorsByOwner).filter(
          (descriptor) => descriptor.semantics?.role === "blockquote"
        )
      : [];

    expect(quoteFragments.length).toBeGreaterThan(1);
    expect(rootIds.size).toBe(1);
    expect([...rootIds][0]).toContain("recursive-child-flow");
    expect(quoteDescriptors.length).toBe(quoteFragments.length);
    expect(new Set(quoteDescriptors.map(
      (descriptor) => descriptor.owner.region.visualInstanceId
    )).size).toBe(quoteFragments.length);
  });
});

/**
 * Creates one editor whose document contains a recursive blockquote.
 *
 * @param paragraphs - Paragraph text owned by the blockquote.
 * @returns Editor configured with the built-in blockquote schema.
 */
function createBlockquoteEditor(paragraphs: readonly string[]) {
  return createEditor({
    extensions: [StarterKit],
    content: {
      type: "doc",
      content: [{
        type: "blockquote",
        content: paragraphs.map((text) => ({
          type: "paragraph",
          content: [{ type: "text", text }]
        }))
      }]
    }
  });
}
