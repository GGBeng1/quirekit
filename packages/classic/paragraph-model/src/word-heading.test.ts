// @vitest-environment happy-dom

import { QuireEditor, type QuireJSONContent } from "@quirekit/core";
import { TextSelection, undo } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { WordParagraph } from "./extension";
import {
  resolveWordHeadingStyleLevel
} from "./model";
import { WordHeading } from "./word-heading";

describe("Word heading presets", () => {
  it("does not turn a custom outline paragraph into a visual heading preset", () => {
    expect(resolveWordHeadingStyleLevel({
      styleId: "ListParagraph1",
      outlineLevel: 0,
      alignment: null,
      direction: null,
      indentation: { start: null, end: null, firstLine: null },
      tabs: null,
      spacing: {
        before: null,
        beforeLines: null,
        beforeAutoSpacing: null,
        after: null,
        afterLines: null,
        afterAutoSpacing: null,
        line: null
      },
      pagination: {
        widowControl: null,
        keepNext: null,
        keepLines: null,
        pageBreakBefore: null
      },
      documentGrid: { adjustRightIndent: null, snapToGrid: null },
      eastAsianLayout: {
        autoSpaceLatin: null,
        autoSpaceNumber: null,
        wordWrap: null,
        kinsoku: null,
        overflowPunctuation: null,
        compressLineStartPunctuation: null
      },
      preservation: null
    })).toBeNull();
  });

  it("applies heading semantics to an ordinary paragraph", () => {
    const editor = createEditor({
      type: "paragraph",
      content: [{ type: "text", text: "alpha" }]
    });

    expect(editor.commands.setWordHeading({ level: 2 })).toBe(true);
    expect(editor.state.doc.child(0)).toMatchObject({
      type: { name: "paragraph" },
      attrs: {
        wordParagraph: {
          styleId: "Heading2",
          outlineLevel: 1
        }
      }
    });
  });

  it("normalizes a legacy heading node and toggles it back to body semantics", () => {
    const editor = createEditor({
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "legacy" }]
    });

    expect(editor.commands.toggleWordHeading({ level: 3 })).toBe(true);
    expect(editor.state.doc.child(0).type.name).toBe("paragraph");
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      styleId: "Heading3",
      outlineLevel: 2
    });
    expect(editor.commands.toggleWordHeading({ level: 3 })).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      styleId: null,
      outlineLevel: null
    });
  });

  it("projects canonical heading paragraphs to semantic HTML and Markdown", () => {
    const editor = createEditor({
      type: "paragraph",
      attrs: {
        wordParagraph: {
          styleId: "Heading2",
          outlineLevel: 1
        }
      },
      content: [{ type: "text", text: "Semantic title" }]
    });
    const before = editor.getJSON();

    expect(editor.getHTML()).toBe("<h2>Semantic title</h2>");
    expect(editor.getMarkdown()).toBe("## Semantic title");
    expect(editor.getJSON()).toEqual(before);
  });

  it("keeps body paragraphs unchanged and caps external heading levels at six", () => {
    const body = createEditor({
      type: "paragraph",
      content: [{ type: "text", text: "Body" }]
    });
    const deepHeading = createEditor({
      type: "paragraph",
      attrs: {
        wordParagraph: {
          styleId: "Heading8",
          outlineLevel: 7
        }
      },
      content: [{ type: "text", text: "Deep title" }]
    });

    expect(body.getHTML()).toBe("<p>Body</p>");
    expect(body.getMarkdown()).toBe("Body");
    expect(deepHeading.getHTML()).toBe("<h6>Deep title</h6>");
    expect(deepHeading.getMarkdown()).toBe("###### Deep title");
  });

  it("creates a body paragraph after Enter at the end of a heading", () => {
    const editor = createEditor({
      type: "paragraph",
      attrs: {
        wordParagraph: {
          styleId: "Heading2",
          outlineLevel: 1,
          alignment: "center"
        }
      },
      content: [{ type: "text", text: "Title" }]
    });
    setTextSelection(editor, 6);

    expect(editor.commands.keyboardShortcut("Enter")).toBe(true);
    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      styleId: "Heading2",
      outlineLevel: 1
    });
    expect(editor.state.doc.child(1).attrs.wordParagraph).toMatchObject({
      styleId: null,
      outlineLevel: null,
      alignment: "center"
    });

    expect(undo(editor.state.pm, editor.view.dispatch)).toBe(true);
    expect(editor.state.doc.childCount).toBe(1);
  });

  it("retains heading semantics when Enter splits heading text in the middle", () => {
    const editor = createEditor({
      type: "paragraph",
      attrs: {
        wordParagraph: {
          styleId: "Heading3",
          outlineLevel: 2
        }
      },
      content: [{ type: "text", text: "Title" }]
    });
    setTextSelection(editor, 3);

    expect(editor.commands.keyboardShortcut("Enter")).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      styleId: "Heading3",
      outlineLevel: 2
    });
    expect(editor.state.doc.child(1).attrs.wordParagraph).toMatchObject({
      styleId: "Heading3",
      outlineLevel: 2
    });
  });

  it("allows integrators to opt into heading continuation at the end", () => {
    const editor = createEditor(
      {
        type: "paragraph",
        attrs: {
          wordParagraph: {
            styleId: "Heading1",
            outlineLevel: 0
          }
        },
        content: [{ type: "text", text: "Title" }]
      },
      true
    );
    setTextSelection(editor, 6);

    expect(editor.commands.keyboardShortcut("Enter")).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordParagraph).toMatchObject({
      styleId: "Heading1",
      outlineLevel: 0
    });
  });
});

/**
 * Creates an editor around one paragraph-like textblock.
 *
 * @param textblock - Paragraph or legacy heading JSON.
 * @returns Editor with Word paragraph and heading behavior installed.
 */
function createEditor(
  textblock: QuireJSONContent,
  keepHeadingOnEnter = false
): QuireEditor {
  return new QuireEditor({
    extensions: [
      StarterKit,
      WordParagraph,
      WordHeading.configure({ keepHeadingOnEnter })
    ],
    content: {
      type: "doc",
      content: [textblock]
    }
  });
}

/**
 * Places the editor selection at one document position.
 *
 * @param editor - Editor receiving the selection.
 * @param position - Resolved text position.
 * @returns Nothing.
 */
function setTextSelection(editor: QuireEditor, position: number): void {
  editor.view.dispatch(
    editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, position))
  );
}
