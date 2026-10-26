import { createEditor } from "@quirekit/core";
import { Formatting } from "@quirekit/extensions";
import { StarterKit } from "@quirekit/starter-kit";
import { WordParagraph } from "@quirekit/classic-paragraph-model";
import { describe, expect, it } from "vitest";
import { WordNumbering } from "./extension";

describe("Word numbering formatting provider", () => {
  it("copies and clears flat numbering only for paragraph targets", () => {
    const editor = createEditor({
      extensions: [StarterKit, WordParagraph, WordNumbering, Formatting],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: {
              wordNumbering: {
                numId: "source-list",
                level: 2,
                startOverride: null,
                task: null
              }
            },
            content: [{ type: "text", text: "Source" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Target" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Second" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.copyFormatting()).toBe(true);
    expect(editor.commands.setTextSelection({ from: 9, to: 23 })).toBe(true);
    expect(editor.commands.pasteFormatting()).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordNumbering).toEqual({
      numId: "source-list",
      level: 2,
      startOverride: null,
      task: null
    });
    expect(editor.state.doc.child(2).attrs.wordNumbering).toEqual({
      numId: "source-list",
      level: 2,
      startOverride: null,
      task: null
    });
    expect(editor.commands.clearFormatting()).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordNumbering).toBeNull();
    expect(editor.state.doc.child(2).attrs.wordNumbering).toBeNull();
    editor.destroy();
  });
});
