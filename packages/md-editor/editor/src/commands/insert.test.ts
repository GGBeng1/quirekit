import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import { GFM } from "@quirekit/lezer-markdown";
import { insertMarkdownBlock } from "./insert";

const table = "| a | b |\n| --- | --- |\n| one | two |";
const payload = "| x |\n| --- |\n| y |";

/** @param doc - Markdown fixture. @param from - Selection start. @param to - Selection end. @returns Fully parsed source. */
function fixture(doc: string, from: number, to = from): EditorState {
  const state = EditorState.create({ doc, selection: EditorSelection.single(from, to), extensions: [markdown({ extensions: GFM })] });
  expect(ensureSyntaxTree(state, doc.length, 1000)).not.toBeNull();
  return state.update({}).state;
}

describe("structural insertion at a text selection", () => {
  it("refuses table headers, cells and selections spanning cells without changing source", () => {
    for (const [from, to] of [[2, 2], [table.indexOf("one"), table.indexOf("one") + 2], [table.indexOf("one"), table.indexOf("two") + 3]]) {
      const state = fixture(table, from!, to!);
      expect(insertMarkdownBlock(payload)(state)).toBeNull();
      expect(state.doc.toString()).toBe(table);
    }
  });
  it("refuses code, list and quote interiors, incomplete fences and partial inline markup", () => {
    for (const doc of ["```ts\nab\n```", "```ts\nab", "- ab\n- cd", "> ab", "text **ab** end", "[ab](/link)", "`ab`"]) {
      expect(insertMarkdownBlock(payload)(fixture(doc, doc.indexOf("ab") + 1))).toBeNull();
    }
  });
  it("refuses a selection across independently owned blocks", () => {
    expect(insertMarkdownBlock(payload)(fixture("first\n\nsecond", 2, 10))).toBeNull();
  });
  it("inserts at a paragraph boundary and replaces a complete block", () => {
    const state = fixture("before\nafter", 6);
    const spec = insertMarkdownBlock(payload)(state);
    expect(spec).not.toBeNull();
    expect(state.update(spec!).state.doc.toString()).toBe(`before\n\n${payload}\n\nafter`);
    const selected = fixture(table, 0, table.length);
    expect(selected.update(insertMarkdownBlock("replacement")(selected)!).state.doc.toString()).toBe("replacement");
  });
  it("keeps blank-line insertion and complete inline replacements available", () => {
    const state = fixture("before\n\n", 8);
    expect(state.update(insertMarkdownBlock(payload)(state)!).state.doc.toString()).toBe(`before\n\n${payload}`);
    const inline = fixture("one **two** three", 4, 11);
    expect(inline.update(insertMarkdownBlock(payload)(inline)!).state.doc.toString()).toBe(`one \n\n${payload}\n\n three`);
  });
});
