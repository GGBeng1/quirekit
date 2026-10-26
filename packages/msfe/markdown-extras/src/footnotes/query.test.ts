import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import { footnoteSyntax } from "./syntax";
import { queryFootnotes, getFootnoteWork } from "./query";

/** @param doc - Footnote source. @returns Accepted complete test state. */
function state(doc: string): EditorState {
  let state = EditorState.create({ doc, extensions: markdown({ extensions: footnoteSyntax }) });
  ensureSyntaxTree(state, state.doc.length, 1000); state = state.update({}).state;
  return state;
}
describe("footnote resolution", () => {
  it("merges inline notes into resolved-reference order and reuses the same index for selection", () => {
    const source = "[^missing] ^[first **body**] [^a] ^[third] [^a]\n\n[^a]: second";
    const before = state(source), index = queryFootnotes(before);
    expect([...index.inline.values()]).toEqual([1, 3]);
    expect(index.entries.get("A")?.number).toBe(2);
    expect(queryFootnotes(before.update({ selection: { anchor: source.indexOf("third") } }).state)).toBe(index);
    const from = source.indexOf("^[first"), to = source.indexOf(" [^a]", from);
    const after = before.update({ changes: { from, to, insert: "plain" } }).state;
    expect(queryFootnotes(after).entries.get("A")?.number).toBe(1);
    expect([...queryFootnotes(after).inline.values()]).toEqual([2]);
  });
  it("numbers first resolved use, shares duplicate uses, and retains unresolved source identity", () => {
    const source = "[^missing] [^B] [^a] [^b]\n\n[^a]: A\n\n[^b]: B\n\n[^B]: duplicate";
    const result = queryFootnotes(state(source));
    expect(result.status).toBe("ready");
    expect(result.entries.get("B")?.number).toBe(1);
    expect(result.entries.get("A")?.number).toBe(2);
    expect(result.entries.get("B")?.references).toHaveLength(2);
    expect(result.entries.get("B")?.definition?.from).toBe(source.indexOf("[^b]:"));
    expect(result.entries.get("MISSING")?.number).toBeUndefined();
  });
  it("reuses an accepted tree across selection changes and reindexes source edits", () => {
    const before = state("[^a]\n\n[^a]: definition"), index = queryFootnotes(before), work = getFootnoteWork(before);
    const moved = before.update({ selection: { anchor: 2 } }).state;
    expect(queryFootnotes(moved)).toBe(index); expect(getFootnoteWork(moved)).toEqual(work);
    const edited = moved.update({ changes: { from: 0, to: 4, insert: "[^missing]" } }).state;
    expect(queryFootnotes(edited).entries.get("A")?.number).toBeUndefined();
  });
  it("reports incomplete accepted trees as pending instead of missing", () => {
    const partial = EditorState.create({ doc: "[^last]\n\n" + "paragraph\n\n".repeat(30000) + "[^last]: end", extensions: markdown({ extensions: footnoteSyntax }) });
    expect(queryFootnotes(partial).status).toBe("pending"); expect(getFootnoteWork(partial).builds).toBe(0);
  });
});
