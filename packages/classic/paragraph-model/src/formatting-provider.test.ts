import { createEditor, type QuireJSONContent } from "@quirekit/core";
import { Formatting } from "@quirekit/extensions";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { WordParagraph } from "./extension";

describe("Word paragraph formatting provider", () => {
  it("copies complete-paragraph format and retains target preservation", () => {
    const editor = createEditor({
      extensions: [StarterKit, WordParagraph, Formatting],
      content: paragraphFormattingDocument()
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.copyFormatting()).toBe(true);
    expect(editor.commands.setTextSelection({ from: 9, to: 15 })).toBe(true);
    expect(editor.commands.pasteFormatting()).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordParagraph).toMatchObject({
      alignment: "center",
      direction: "rtl",
      preservation: { litAstAttrs: { target: true } }
    });
    editor.destroy();
  });

  it("does not clear paragraph fields for a partial text selection", () => {
    const editor = createEditor({
      extensions: [StarterKit, WordParagraph, Formatting],
      content: paragraphFormattingDocument()
    });

    expect(editor.commands.setTextSelection({ from: 2, to: 5 })).toBe(true);
    expect(editor.commands.clearFormatting()).toBe(false);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      alignment: "center",
      direction: "rtl"
    });
    editor.destroy();
  });

  it("applies one source paragraph format across every selected target paragraph", () => {
    const document = paragraphFormattingDocument();
    document.content!.push({
      type: "paragraph",
      attrs: {
        wordParagraph: {
          alignment: "start",
          preservation: { litAstAttrs: { secondTarget: true } }
        }
      },
      content: [{ type: "text", text: "Second" }]
    });
    const editor = createEditor({
      extensions: [StarterKit, WordParagraph, Formatting],
      content: document
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.copyFormatting()).toBe(true);
    expect(editor.commands.setTextSelection({ from: 9, to: 23 })).toBe(true);
    expect(editor.commands.pasteFormatting()).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordParagraph).toMatchObject({
      alignment: "center",
      direction: "rtl",
      preservation: { litAstAttrs: { target: true } }
    });
    expect(editor.state.doc.child(2).attrs.wordParagraph).toMatchObject({
      alignment: "center",
      direction: "rtl",
      preservation: { litAstAttrs: { secondTarget: true } }
    });
    editor.destroy();
  });
});

/**
 * Creates source and target paragraphs with independent preservation envelopes.
 *
 * @returns Paragraph-formatting fixture.
 */
function paragraphFormattingDocument(): QuireJSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: {
          wordParagraph: {
            alignment: "center",
            direction: "rtl",
            preservation: { litAstAttrs: { source: true } }
          }
        },
        content: [{ type: "text", text: "Source" }]
      },
      {
        type: "paragraph",
        attrs: {
          wordParagraph: {
            alignment: "end",
            preservation: { litAstAttrs: { target: true } }
          }
        },
        content: [{ type: "text", text: "Target" }]
      }
    ]
  };
}
