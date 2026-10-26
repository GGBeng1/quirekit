import { describe, expect, it } from "vitest";
import { createEditorBlockMarqueeRect, resolveEditorBlockMarqueeRange } from "./geometry";
import { createEditor } from "@quirekit/core";
import { BlockInteraction, readBlockCatalog } from "@quirekit/extensions";
import type { QuireMountedBlockFragment } from "@quirekit/core";

describe("block marquee geometry", () => {
  it("keeps its document anchor through scrolling and supports both drag directions", () => {
    const anchor = { x: -40, y: 80 }, viewport = { x: 20, y: 50, width: 800, height: 600 };
    expect(createEditorBlockMarqueeRect(anchor, { x: 400, y: 900 }, { x: 100, y: -100 }, viewport))
      .toEqual({ x: 60, y: -20, width: 340, height: 669 });
    expect(createEditorBlockMarqueeRect(anchor, { x: 0, y: 0 }, { x: 100, y: 100 }, viewport))
      .toEqual({ x: 21, y: 51, width: 39, height: 129 });
  });

  it("joins exact source geometry to one continuous sibling range without descending into blocks", () => {
    const editor = createEditor({ extensions: [BlockInteraction], content: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "One" }] },
      { type: "paragraph", content: [{ type: "text", text: "Two" }] },
      { type: "paragraph", content: [{ type: "text", text: "Three" }] }
    ] } });
    const catalog = readBlockCatalog(editor)!;
    const fragments = catalog.blocks.map(block => ({ from: block.from, to: block.to, sourceDocument: catalog.doc }) as QuireMountedBlockFragment);
    const range = resolveEditorBlockMarqueeRange(catalog, [fragments[2]!, fragments[0]!, fragments[0]!]);
    expect(range).toEqual({ anchor: catalog.blocks[0], focus: catalog.blocks[2], expectedDocumentRevision: catalog.revision });
    expect(resolveEditorBlockMarqueeRange(catalog, [])).toBeNull();
    expect(resolveEditorBlockMarqueeRange(catalog, [{ ...fragments[0]!, to: 999 }])).toBeNull();
    editor.commands.insertContent("Changed");
    expect(resolveEditorBlockMarqueeRange(readBlockCatalog(editor)!, fragments)).toBeNull();
    editor.destroy();
  });
});
