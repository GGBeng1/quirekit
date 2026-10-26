import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { TextSelection } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { WordParagraph } from "../extension";
import {
  createWordParagraphCharacterMeasurement,
  createWordParagraphDxaMeasurement
} from "../model";
import { readWordParagraphSelectionContext } from "../selection";
import type { SetWordParagraphIndentationOptions } from "./types";

describe("Word paragraph indentation", () => {
  it("updates one cursor paragraph and restores it through history", () => {
    const editor = createEditor();
    const indentation = {
      start: createWordParagraphDxaMeasurement(360),
      end: createWordParagraphDxaMeasurement(180),
      firstLine: createWordParagraphCharacterMeasurement(200)
    } as const;

    expect(editor.commands.setWordParagraphIndentation({ indentation })).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({ indentation });
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toBeNull();
  });

  it("updates every covered paragraph in one transaction and preserves sibling attrs", () => {
    const editor = createEditor();
    let transactionCount = 0;
    editor.on("transaction", () => { transactionCount += 1; });
    const secondParagraphEnd = editor.state.doc.child(0).nodeSize
      + editor.state.doc.child(1).nodeSize - 1;
    editor.view.dispatch(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.doc, 1, secondParagraphEnd)
    ));
    transactionCount = 0;
    const indentation = {
      start: createWordParagraphDxaMeasurement(240),
      end: null,
      firstLine: createWordParagraphDxaMeasurement(-240)
    } as const;

    expect(editor.commands.setWordParagraphIndentation({ indentation })).toBe(true);
    expect(transactionCount).toBe(1);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({ indentation });
    expect(editor.state.doc.child(1).attrs.wordParagraph).toMatchObject({ indentation });
    expect(editor.state.doc.child(1).attrs.level).toBe(2);
  });

  it("reports mixed selection context and rejects invalid or unchanged values", () => {
    const editor = createEditor();
    const indentation = {
      start: createWordParagraphDxaMeasurement(240),
      end: null,
      firstLine: null
    } as const;
    expect(editor.commands.setWordParagraphIndentation({ indentation })).toBe(true);
    expect(editor.commands.setWordParagraphIndentation({ indentation })).toBe(false);
    expect(editor.commands.setWordParagraphIndentation({
      indentation: { start: { unit: "pixel", value: 2 }, end: null, firstLine: null }
    } as unknown as SetWordParagraphIndentationOptions)).toBe(false);

    const secondParagraphEnd = editor.state.doc.child(0).nodeSize
      + editor.state.doc.child(1).nodeSize - 1;
    editor.view.dispatch(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.doc, 1, secondParagraphEnd)
    ));
    const context = readWordParagraphSelectionContext(editor.state, 240);
    expect(context).toMatchObject({ mixed: true, paragraphCount: 2 });
    expect(context?.formattingValues).toHaveLength(2);
    expect(context?.formattingValues[0]?.indentation).toEqual(indentation);
    expect(context?.formattingValues[1]?.indentation).not.toEqual(indentation);
  });

  it("increases ordinary paragraphs and headings with the same character step", () => {
    const editor = createEditor();

    expect(editor.commands.increaseWordParagraphIndentation()).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      indentation: { start: { unit: "character", value: 200 } }
    });

    const headingPosition = editor.state.doc.child(0).nodeSize + 1;
    editor.view.dispatch(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.doc, headingPosition)
    ));
    expect(editor.commands.increaseWordParagraphIndentation()).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordParagraph).toMatchObject({
      indentation: { start: { unit: "character", value: 200 } }
    });
  });

  it("decreases without crossing the logical text-column start", () => {
    const editor = createEditor();

    expect(editor.commands.decreaseWordParagraphIndentation()).toBe(false);
    expect(editor.commands.increaseWordParagraphIndentation()).toBe(true);
    expect(editor.commands.increaseWordParagraphIndentation()).toBe(true);
    expect(editor.commands.decreaseWordParagraphIndentation()).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordParagraph).toMatchObject({
      indentation: { start: { unit: "character", value: 200 } }
    });
  });
});

/**
 * Creates a two-textblock paragraph formatting fixture.
 *
 * @returns Editor with history and Word paragraph formatting installed.
 */
function createEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph],
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "alpha" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "beta" }] }
      ]
    }
  });
}
