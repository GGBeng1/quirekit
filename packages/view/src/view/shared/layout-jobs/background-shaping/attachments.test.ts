import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createQuireBlockShapeCache } from "@quirekit/view-engine";
import { QuireLayoutJobExecutionError } from "../errors";
import { compileQuireBackgroundShapingBatch } from "./attachments";
import type {
  QuireBackgroundShapingBlockInput,
  QuireBackgroundShapingCapabilitySnapshot,
  QuireBackgroundShapingJobOutput
} from "./types";

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
 * Builds a clone-safe shaping block for one attachment key.
 *
 * @param attachmentKey - Request-local attachment key.
 * @param from - Absolute text range start.
 * @returns Pre-resolved shaping block.
 */
function block(
  attachmentKey: string,
  from: number
): QuireBackgroundShapingBlockInput {
  return {
    attachmentKey,
    id: attachmentKey,
    runs: [{
      text: "hello",
      range: { from, to: from + 5 },
      font: "16px sans-serif",
      marks: []
    }],
    width: 100,
    lineHeight: 20,
    textBaselineOffset: 15,
    lineBreakMode: "word",
    baseDirection: "auto"
  };
}

/**
 * Builds one text fragment for cache attachment tests.
 *
 * @param id - Stable fragment id.
 * @param from - Absolute document start.
 * @returns Renderer-neutral text fragment.
 */
function fragment(id: string, from: number) {
  return {
    id,
    text: "hello",
    range: { from, to: from + 5 },
    rect: { x: 0, y: 0, width: 50, height: 20 },
    font: "16px sans-serif",
    lineHeight: 20,
    baseline: 15,
    caretStops: [
      { position: { pos: from, bias: 1 as const }, localX: 0 },
      { position: { pos: from + 5, bias: 1 as const }, localX: 50 }
    ]
  };
}

/**
 * Creates an editor with two top-level paragraph nodes.
 *
 * @returns Editor whose immutable child nodes can back attachment tests.
 */
function editorWithTwoParagraphs() {
  const editor = createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })]
  });
  const paragraphType = editor.state.schema.nodes.paragraph!;
  const docType = editor.state.schema.nodes.doc!;
  editor.setContent(docType.create(null, [
    paragraphType.create(null, editor.state.schema.text("one")),
    paragraphType.create(null, editor.state.schema.text("two"))
  ]));
  return editor;
}

describe("background shaping attachments", () => {
  it("keeps live nodes out of the clone-safe payload and warms their cache entries", () => {
    const editor = editorWithTwoParagraphs();
    const firstNode = editor.state.doc.child(0);
    const secondNode = editor.state.doc.child(1);
    const firstBlock = block("attachment:0", 1);
    const secondBlock = block("attachment:1", 6);
    const batch = compileQuireBackgroundShapingBatch({
      capabilities,
      attachments: [
        { node: firstNode, block: firstBlock, contentStart: 1 },
        { node: secondNode, block: secondBlock, contentStart: 6 }
      ]
    });
    const output: QuireBackgroundShapingJobOutput = {
      blocks: [
        { attachmentKey: "attachment:0", fragments: [fragment("first", 1)] },
        { attachmentKey: "attachment:1", fragments: [fragment("second", 6)] }
      ]
    };
    const cache = createQuireBlockShapeCache();

    expect(structuredClone(batch.payload)).toEqual(batch.payload);
    expect(batch.payload).not.toHaveProperty("attachments");
    expect(batch.attachAcceptedOutput(output, cache)).toEqual({
      attachedBlockCount: 2
    });
    expect(cache.get(firstNode, firstBlock.width, 1)?.[0]?.id).toBe("first");
    expect(cache.get(secondNode, secondBlock.width, 6)?.[0]?.id).toBe("second");
  });

  it("rejects incomplete output before mutating any cache entry", () => {
    const editor = editorWithTwoParagraphs();
    const firstNode = editor.state.doc.child(0);
    const secondNode = editor.state.doc.child(1);
    const firstBlock = block("attachment:0", 1);
    const secondBlock = block("attachment:1", 6);
    const batch = compileQuireBackgroundShapingBatch({
      capabilities,
      attachments: [
        { node: firstNode, block: firstBlock, contentStart: 1 },
        { node: secondNode, block: secondBlock, contentStart: 6 }
      ]
    });
    const cache = createQuireBlockShapeCache();

    expect(() => batch.attachAcceptedOutput({
      blocks: [
        { attachmentKey: "attachment:0", fragments: [fragment("first", 1)] }
      ]
    }, cache)).toThrow(QuireLayoutJobExecutionError);
    expect(cache.get(firstNode, firstBlock.width, 1)).toBeUndefined();
    expect(cache.get(secondNode, secondBlock.width, 6)).toBeUndefined();
  });

  it("rejects duplicate request-local attachment identities", () => {
    const editor = editorWithTwoParagraphs();
    const duplicate = block("attachment:duplicate", 1);

    expect(() => compileQuireBackgroundShapingBatch({
      capabilities,
      attachments: [
        { node: editor.state.doc.child(0), block: duplicate, contentStart: 1 },
        { node: editor.state.doc.child(1), block: duplicate, contentStart: 6 }
      ]
    })).toThrow(/Duplicate background shaping attachment key/u);
  });
});
