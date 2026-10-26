import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { WordParagraph } from "../extension";
import { readWordParagraphSelectionContext } from "../selection";

describe("Word paragraph properties", () => {
  it.each([{ snapToGrid: "off" }, { adjustRightIndent: 0 }, { snapToGrid: undefined }, { unknown: true }, null])
    ("rejects invalid grid patches without dispatch: %s", documentGrid => {
      const editor = createEditor();
      try {
        const before = editor.state.doc;
        expect(editor.commands.setWordParagraphProperties({ properties: { documentGrid } } as never)).toBe(false);
        expect(editor.state.doc).toBe(before);
      } finally { editor.destroy(); }
    });
  it.each([{ autoSpaceLatin: "off" }, { autoSpaceNumber: 0 }, { kinsoku: undefined }, { unknown: true }, null])
    ("rejects invalid East Asian patches without dispatch: %s", eastAsianLayout => {
      const editor = createEditor();
      try {
        const before = editor.state.doc;
        expect(editor.commands.setWordParagraphProperties({ properties: { eastAsianLayout } } as never)).toBe(false);
        expect(editor.state.doc).toBe(before);
      } finally { editor.destroy(); }
    });
  it("accepts body outline level without replacing style and keeps each choice undoable", () => {
    const editor = createEditor();
    try {
      editor.commands.setWordParagraphProperties({ properties: { styleId: "Heading2" } });
      for (const outlineLevel of [2, 9, null]) {
        expect(editor.commands.setWordParagraphProperties({ properties: { outlineLevel } })).toBe(true);
        expect(editor.state.doc.firstChild?.attrs.wordParagraph).toMatchObject({
          styleId: "Heading2", outlineLevel,
          preservation: { litAstAttrs: { customProperty: "retained" } }
        });
      }
      for (const outlineLevel of [9, 2, null]) {
        expect(editor.commands.undo()).toBe(true);
        expect(editor.state.doc.firstChild?.attrs.wordParagraph).toMatchObject({ styleId: "Heading2", outlineLevel });
      }
      expect(editor.commands.redo()).toBe(true);
      expect(editor.state.doc.firstChild?.attrs.wordParagraph.outlineLevel).toBe(2);
    } finally { editor.destroy(); }
  });

  it.each([-1, 10, 1.5, NaN, "9"])("rejects invalid outline level %s without dispatch", outlineLevel => {
    const editor = createEditor();
    try {
      const before = editor.state.doc;
      expect(editor.commands.setWordParagraphProperties({ properties: { outlineLevel } } as never)).toBe(false);
      expect(editor.state.doc).toBe(before);
    } finally { editor.destroy(); }
  });

  it("keeps consecutive alignment choices as independent undoable intents", () => {
    const editor = createEditor();
    try {
      for (const alignment of ["justify", "distribute", "center"] as const) {
        expect(editor.commands.setWordParagraphProperties({ properties: { alignment } })).toBe(true);
      }
      for (const alignment of ["distribute", "justify", null]) {
        expect(editor.commands.undo()).toBe(true);
        expect(editor.state.doc.firstChild?.attrs.wordParagraph.alignment ?? null).toBe(alignment);
      }
      expect(editor.commands.redo()).toBe(true);
      expect(editor.state.doc.firstChild?.attrs.wordParagraph.alignment).toBe("justify");
    } finally { editor.destroy(); }
  });

  it("applies explicit false values without discarding preserved source attrs", () => {
    const editor = createEditor();

    expect(editor.commands.setWordParagraphProperties({
      properties: {
        alignment: "justify",
        direction: "rtl",
        pagination: {
          widowControl: false,
          keepNext: true,
          keepLines: false,
          pageBreakBefore: null
        },
        documentGrid: {
          adjustRightIndent: false,
          snapToGrid: true
        },
        eastAsianLayout: {
          autoSpaceLatin: false,
          autoSpaceNumber: true,
          wordWrap: false,
          kinsoku: true,
          overflowPunctuation: false,
          compressLineStartPunctuation: true
        }
      }
    })).toBe(true);

    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      alignment: "justify",
      direction: "rtl",
      pagination: {
        widowControl: false,
        keepNext: true,
        keepLines: false,
        pageBreakBefore: null
      },
      preservation: {
        litAstAttrs: { customProperty: "retained" }
      }
    });
    expect(readWordParagraphSelectionContext(editor.state, 240)?.direction).toBe("rtl");
  });
});

/**
 * Creates one paragraph with source-only LitAST metadata.
 *
 * @returns Editor with Word paragraph commands installed.
 */
function createEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph],
    content: {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: {
          wordParagraph: {
            preservation: {
              litAstAttrs: { customProperty: "retained" }
            }
          }
        },
        content: [{ type: "text", text: "alpha" }]
      }]
    }
  });
}
