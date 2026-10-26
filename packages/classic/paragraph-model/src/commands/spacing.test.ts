import { Editor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { WordParagraph } from "../extension";
import type {
  SetWordParagraphLineSpacingOptions,
  SetWordParagraphSpacingOptions
} from "./types";

describe("Word paragraph spacing commands", () => {
  it("applies complete spacing to every selected paragraph", () => {
    const editor = createEditor();
    expect(editor.commands.setTextSelection({ from: 1, to: 8 })).toBe(true);
    expect(editor.commands.setWordParagraphSpacing({
      spacing: {
        before: { unit: "dxa", value: 120 },
        beforeLines: null,
        beforeAutoSpacing: null,
        after: { unit: "dxa", value: 240 },
        afterLines: null,
        afterAutoSpacing: null,
        line: { rule: "auto", value: 360 }
      }
    })).toBe(true);

    expect(editor.state.doc.child(0).attrs.wordParagraph.spacing).toEqual({
      before: { unit: "dxa", value: 120 },
      beforeLines: null,
      beforeAutoSpacing: null,
      after: { unit: "dxa", value: 240 },
      afterLines: null,
      afterAutoSpacing: null,
      line: { rule: "auto", value: 360 }
    });
    expect(editor.state.doc.child(1).attrs.wordParagraph.spacing).toEqual({
      before: { unit: "dxa", value: 120 },
      beforeLines: null,
      beforeAutoSpacing: null,
      after: { unit: "dxa", value: 240 },
      afterLines: null,
      afterAutoSpacing: null,
      line: { rule: "auto", value: 360 }
    });
  });

  it("updates line spacing without flattening before and after distances", () => {
    const editor = createEditor();
    expect(editor.commands.setTextSelection(2)).toBe(true);
    expect(editor.commands.setWordParagraphSpacing({
      spacing: {
        before: { unit: "dxa", value: 100 },
        beforeLines: null,
        beforeAutoSpacing: null,
        after: { unit: "dxa", value: 200 },
        afterLines: null,
        afterAutoSpacing: null,
        line: null
      }
    })).toBe(true);
    expect(editor.commands.setWordParagraphLineSpacing({
      line: { rule: "exact", value: 360 }
    })).toBe(true);

    expect(editor.state.doc.child(0).attrs.wordParagraph.spacing).toEqual({
      before: { unit: "dxa", value: 100 },
      beforeLines: null,
      beforeAutoSpacing: null,
      after: { unit: "dxa", value: 200 },
      afterLines: null,
      afterAutoSpacing: null,
      line: { rule: "exact", value: 360 }
    });
    expect(editor.commands.setWordParagraphLineSpacing({ line: null })).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph.spacing.line).toBeNull();
  });

  it("rejects ambiguous CSS and invalid OOXML values", () => {
    const editor = createEditor();
    expect(editor.commands.setWordParagraphLineSpacing({
      line: "1.5"
    } as unknown as SetWordParagraphLineSpacingOptions)).toBe(false);
    expect(editor.commands.setWordParagraphLineSpacing({
      line: { rule: "auto", value: 0 }
    })).toBe(false);
    expect(editor.commands.setWordParagraphSpacing({
      spacing: {
        before: { unit: "character", value: 100 },
        after: null,
        line: null
      }
    } as unknown as SetWordParagraphSpacingOptions)).toBe(false);
  });
});

/**
 * Creates a two-paragraph editor with Word paragraph ownership installed.
 *
 * @returns Editor used by selection-aware command tests.
 */
function createEditor(): Editor {
  return new Editor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      WordParagraph
    ],
    content: {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "First" }]
      }, {
        type: "paragraph",
        content: [{ type: "text", text: "Second" }]
      }]
    }
  });
}
