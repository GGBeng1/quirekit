import { createEditor, Node, type QuireJSONContent } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import {
  CharacterCount,
  type CharacterCountStorage
} from "./character-count";

const Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+"
});

const Paragraph = Node.create({
  name: "paragraph",
  group: "block",
  content: "inline*"
});

const Text = Node.create({
  name: "text",
  group: "inline"
});

const baseExtensions = [Document, Paragraph, Text];

describe("CharacterCount", () => {
  it("exposes editor-bound character and word counters through storage", () => {
    const editor = createEditor({
      extensions: [...baseExtensions, CharacterCount],
      content: paragraphDoc("hello world")
    });
    const storage = editor.storage.characterCount as CharacterCountStorage;

    expect(storage.characters()).toBe(11);
    expect(storage.words()).toBe(2);

    editor.commands.setContent(paragraphDoc("one two three"));

    expect(storage.characters()).toBe(13);
    expect(storage.words()).toBe(3);
  });

  it("supports nodeSize counting mode", () => {
    const editor = createEditor({
      extensions: [
        ...baseExtensions,
        CharacterCount.configure({ mode: "nodeSize" })
      ],
      content: paragraphDoc("hello")
    });
    const storage = editor.storage.characterCount as CharacterCountStorage;

    expect(storage.characters()).toBe(editor.state.doc.nodeSize);
    expect(storage.characters({ mode: "textSize" })).toBe(5);
  });

  it("blocks non-paste transactions that exceed the configured limit", () => {
    const editor = createEditor({
      extensions: [
        ...baseExtensions,
        CharacterCount.configure({ limit: 5 })
      ],
      content: paragraphDoc("hello")
    });

    expect(editor.commands.setTextSelection(6)).toBe(true);
    expect(editor.commands.insertContent("!")).toBe(true);
    expect(editor.getText()).toBe("hello");
  });
});

/**
 * Creates a one-paragraph JSON document for character-count tests.
 *
 * @param text - Paragraph text content.
 * @returns JSON document containing one paragraph.
 */
function paragraphDoc(text: string): QuireJSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }]
      }
    ]
  };
}
