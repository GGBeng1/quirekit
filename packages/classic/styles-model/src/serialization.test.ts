// @vitest-environment happy-dom

import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import {
  WordParagraph,
  defaultWordParagraphFormatting
} from "@quirekit/classic-paragraph-model";
import { describe, expect, it } from "vitest";
import { WordStyles } from "./extension";
import { createDefaultWordParagraphStyleRegistry } from "./model";

describe("Word named style HTML serialization", () => {
  it("resolves an absent direct-formatting carrier through canonical defaults", () => {
    const editor = new QuireEditor({
      extensions: [StarterKit, WordParagraph, WordStyles],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Body" }]
        }]
      }
    });

    expect(editor.state.schema.nodes.paragraph!.spec.toDOM?.(
      editor.state.doc.firstChild!
    )).toEqual(["p", {}, 0]);
  });

  it("projects live effective style typography and exact paragraph geometry", () => {
    const editor = createEditor();
    const paragraph = editor.state.doc.firstChild!;
    const serialize = editor.state.schema.nodes.paragraph!.spec.toDOM!;

    expect(serialize(paragraph)).toEqual([
      "h1",
      {
        style: "font-size: 2em; font-weight: bold; line-height: 2"
      },
      0
    ]);

    const registry = createDefaultWordParagraphStyleRegistry();
    const heading = registry.styles.Heading1!;
    expect(editor.commands.updateWordParagraphStyle({
      style: {
        ...heading,
        paragraph: {
          ...heading.paragraph,
          alignment: "center",
          spacing: {
            before: null,
            beforeLines: null,
            beforeAutoSpacing: null,
            after: null,
            afterLines: null,
            afterAutoSpacing: null,
            line: { rule: "exact", value: 480 }
          }
        },
        text: {
          ...heading.text,
          fontFamily: "Noto Sans SC",
          fontScale: 1.5,
          lineHeightScale: 1.5,
          fontWeight: "normal",
          fontStyle: "italic"
        }
      }
    })).toBe(true);

    expect(serialize(editor.state.doc.firstChild!)).toEqual([
      "h1",
      {
        style: "font-family: \"Noto Sans SC\"; font-size: 1.5em; font-weight: normal; font-style: italic; text-align: center; line-height: 24pt"
      },
      0
    ]);
  });

  it("does not misrepresent Word at-least spacing or distributed alignment", () => {
    const editor = createEditor();
    const registry = createDefaultWordParagraphStyleRegistry();
    const heading = registry.styles.Heading1!;
    expect(editor.commands.updateWordParagraphStyle({
      style: {
        ...heading,
        paragraph: {
          ...heading.paragraph,
          alignment: "distribute",
          spacing: {
            before: null,
            beforeLines: null,
            beforeAutoSpacing: null,
            after: null,
            afterLines: null,
            afterAutoSpacing: null,
            line: { rule: "atLeast", value: 480 }
          }
        }
      }
    })).toBe(true);

    const output = editor.state.schema.nodes.paragraph!.spec.toDOM?.(
      editor.state.doc.firstChild!
    );
    expect(output).toEqual([
      "h1",
      { style: "font-size: 2em; font-weight: bold" },
      0
    ]);
  });
});

/**
 * Creates one editor whose first paragraph consumes the built-in Heading 1.
 *
 * @returns Editor with Word paragraph and named-style behavior installed.
 */
function createEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph, WordStyles],
    content: {
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: {
          wordParagraph: {
            ...defaultWordParagraphFormatting,
            styleId: "Heading1"
          }
        },
        content: [{ type: "text", text: "Heading" }]
      }]
    }
  });
}
