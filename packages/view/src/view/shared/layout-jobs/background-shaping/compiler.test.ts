import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createQuireBlockShapeCache } from "@quirekit/view-engine";
import { compileQuireEditorBackgroundShaping } from "./compiler";
import type { QuireBackgroundShapingCapabilitySnapshot } from "./types";

const capabilities: QuireBackgroundShapingCapabilitySnapshot = {
  measurement: {
    id: "test",
    version: 1,
    mode: "measure-only",
    transferability: "local-only"
  },
  lineBreakerName: null
};

/**
 * Creates an editor containing text, empty, and structured top-level blocks.
 *
 * @returns Editor used to prove compiler capability gaps.
 */
function createFixtureEditor() {
  const editor = createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })]
  });
  const schema = editor.state.schema;
  const paragraph = schema.nodes.paragraph!;
  const blockquote = schema.nodes.blockquote!;
  editor.setContent(schema.nodes.doc!.create(null, [
    paragraph.create(null, schema.text("first paragraph")),
    paragraph.create(),
    blockquote.create(null, paragraph.create(null, schema.text("nested"))),
    paragraph.create(null, schema.text("last paragraph"))
  ]));
  return editor;
}

describe("editor background shaping compiler", () => {
  it("resolves textblocks into clone-safe payload and reports unsupported structures", () => {
    const editor = createFixtureEditor();
    const compilation = compileQuireEditorBackgroundShaping({
      editor,
      fromIndex: 0,
      toIndex: 4,
      capabilities,
      width: 160,
      font: "16px sans-serif",
      lineHeight: 24,
      textBaselineOffset: 18,
      lineBreakMode: "word",
      cache: createQuireBlockShapeCache()
    });

    expect(compilation.batch.payload.blocks.map((entry) => entry.id)).toEqual([
      "paragraph-0",
      "paragraph-3"
    ]);
    expect(compilation.gaps.map((gap) => [gap.blockIndex, gap.code])).toEqual([
      [1, "empty-textblock"],
      [2, "provider-owned"]
    ]);
    expect(structuredClone(compilation.batch.payload)).toEqual(
      compilation.batch.payload
    );
  });

  it("compiles only the requested top-level block window", () => {
    const compilation = compileQuireEditorBackgroundShaping({
      editor: createFixtureEditor(),
      fromIndex: 3,
      toIndex: 4,
      capabilities,
      width: 160,
      font: "16px sans-serif",
      lineHeight: 24,
      textBaselineOffset: 18,
      lineBreakMode: "word",
      cache: createQuireBlockShapeCache()
    });

    expect(compilation.batch.payload.blocks).toHaveLength(1);
    expect(compilation.batch.payload.blocks[0]!.id).toBe("paragraph-3");
    expect(compilation.gaps).toEqual([]);
  });
});
