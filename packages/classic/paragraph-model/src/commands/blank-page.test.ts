import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { WordParagraph } from "../extension";

describe("insertWordBlankPage", () => {
  it("inserts one empty page between split paragraph fragments", () => {
    const editor = createEditor();
    editor.commands.setTextSelection(3);
    let transactionCount = 0;
    editor.on("transaction", () => {
      transactionCount += 1;
    });

    expect(editor.commands.insertWordBlankPage()).toBe(true);
    expect(transactionCount).toBe(1);
    expect(readBlocks(editor)).toEqual([
      { type: "paragraph", text: "al", pageBreakBefore: null },
      { type: "paragraph", text: "", pageBreakBefore: true },
      { type: "paragraph", text: "pha", pageBreakBefore: true }
    ]);
    expect(editor.state.pm.selection.$from.parentOffset).toBe(0);
    expect(editor.state.pm.selection.$from.parent.textContent).toBe("pha");
  });

  it("avoids an unnecessary left fragment at paragraph start", () => {
    const editor = createEditor();
    editor.commands.setTextSelection(1);

    expect(editor.commands.insertWordBlankPage()).toBe(true);
    expect(readBlocks(editor)).toEqual([
      { type: "paragraph", text: "", pageBreakBefore: true },
      { type: "paragraph", text: "alpha", pageBreakBefore: true }
    ]);
  });

  it("creates an empty continuation after a blank page at paragraph end", () => {
    const editor = createEditor();
    editor.commands.setTextSelection(6);

    expect(editor.commands.insertWordBlankPage()).toBe(true);
    expect(readBlocks(editor)).toEqual([
      { type: "paragraph", text: "alpha", pageBreakBefore: null },
      { type: "paragraph", text: "", pageBreakBefore: true },
      { type: "paragraph", text: "", pageBreakBefore: true }
    ]);
  });

  it("deletes selected text and restores the complete operation with undo", () => {
    const editor = createEditor();
    editor.commands.setTextSelection({ from: 2, to: 4 });

    expect(editor.commands.insertWordBlankPage()).toBe(true);
    expect(readBlocks(editor).map((block) => block.text)).toEqual(["a", "", "ha"]);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.textContent).toBe("alpha");
    expect(editor.state.doc.childCount).toBe(1);
  });

  it("uses a body paragraph for the blank page and preserves heading continuations", () => {
    const editor = createEditor({
      type: "heading",
      attrs: {
        level: 2,
        wordParagraph: {
          styleId: "Heading2",
          pagination: { keepNext: true },
          preservation: { litAstAttrs: { source: "fixture" } }
        }
      },
      content: [{ type: "text", text: "title" }]
    });
    editor.commands.setTextSelection(3);

    expect(editor.commands.insertWordBlankPage()).toBe(true);
    expect(readBlocks(editor).slice(0, 3).map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
      "heading"
    ]);
    expect(editor.state.doc.child(2).attrs).toMatchObject({
      level: 2,
      wordParagraph: {
        styleId: "Heading2",
        pagination: { keepNext: true, pageBreakBefore: true },
        preservation: { litAstAttrs: { source: "fixture" } }
      }
    });
  });

  it("supports dry run and rejects nested or node selections", () => {
    const editor = createEditor();
    editor.commands.setTextSelection(3);
    const before = editor.getJSON();

    expect(editor.can().insertWordBlankPage()).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.setNodeSelection(0)).toBe(true);
    expect(editor.commands.insertWordBlankPage()).toBe(false);

    const nested = createEditor({
      type: "blockquote",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "nested" }]
      }]
    });
    nested.commands.setTextSelection(2);
    expect(nested.commands.insertWordBlankPage()).toBe(false);
  });
});

/** One compact block description used by Blank page assertions. */
interface BlankPageBlockState {
  /** ProseMirror node type name. */
  readonly type: string;
  /** Visible block text. */
  readonly text: string;
  /** Canonical paragraph page-boundary value. */
  readonly pageBreakBefore: boolean | null;
}

/**
 * Creates a standalone main-story paragraph fixture.
 *
 * @param block - Optional paragraph-like source block.
 * @returns Editor with Word paragraph commands and history.
 */
function createEditor(
  block: Record<string, unknown> = {
    type: "paragraph",
    content: [{ type: "text", text: "alpha" }]
  }
): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph],
    content: { type: "doc", content: [block] }
  });
}

/**
 * Reads top-level block semantics after Blank page insertion.
 *
 * @param editor - Source editor fixture.
 * @returns Ordered block type, text, and page-boundary values.
 */
function readBlocks(editor: QuireEditor): readonly BlankPageBlockState[] {
  const blocks: BlankPageBlockState[] = [];
  for (let index = 0; index < editor.state.doc.childCount; index += 1) {
    const node = editor.state.doc.child(index);
    blocks.push({
      type: node.type.name,
      text: node.textContent,
      pageBreakBefore:
        node.attrs.wordParagraph?.pagination?.pageBreakBefore ?? null
    });
  }
  return blocks;
}
