import { describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { ensureSyntaxTree, syntaxTree } from "@quirekit/cm-language";
import { markdown } from "@quirekit/cm-lang-markdown";
import { GFM } from "@quirekit/lezer-markdown";
import { toggleSourceMark } from "./toggle";
import { querySourceInline } from "./context";

const bold = { node: "StrongEmphasis", marker: "**", markerNode: "EmphasisMark" };
const italic = { node: "Emphasis", marker: "*", markerNode: "EmphasisMark" };
const strike = { node: "Strikethrough", marker: "~~", markerNode: "StrikethroughMark" };
/** @param doc - Source fixture. @param text - Selected prose. @returns An accepted parser state. */
function selected(doc: string, text: string): EditorState {
  const from = doc.indexOf(text), state = EditorState.create({ doc, selection: EditorSelection.single(from, from + text.length), extensions: markdown({ extensions: GFM }) });
  ensureSyntaxTree(state, doc.length, 1000); return state;
}

describe("semantic inline formatting", () => {
  it("keeps existing bold and italic when the surrounding punctuation admits the new format", () => {
    const state = selected("可以，***清晰***、继续。", "清晰"), spec = toggleSourceMark(strike)(state);
    expect(spec).not.toBeNull();
    const next = state.update(spec!).state;
    expect(next.doc.toString()).toBe("可以，~~***清晰***~~、继续。");
    expect(next.sliceDoc(next.selection.main.from, next.selection.main.to)).toBe("清晰");
    ensureSyntaxTree(next, next.doc.length, 1000);
    expect(syntaxTree(next).toString()).toContain("Strikethrough(StrikethroughMark,Emphasis(EmphasisMark,StrongEmphasis");
  });
  it("refuses mixed delimiter runs beside a word without adding spaces or losing existing formats", () => {
    const state = selected("可以***清晰***、继续。", "清晰");
    expect(toggleSourceMark(strike)(state)).toBeNull();
    expect(state.doc.toString()).toBe("可以***清晰***、继续。");
  });
  for (const order of [[bold, italic, strike], [bold, strike, italic], [strike, italic, bold], [italic, strike, bold]]) {
    it(`retains each style for ${order.map(mark => mark.node).join(" → ")}`, () => {
      let state = selected("可以，清晰、继续。", "清晰");
      for (const mark of order) {
        const spec = toggleSourceMark(mark)(state); expect(spec).not.toBeNull(); state = state.update(spec!).state;
        ensureSyntaxTree(state, state.doc.length, 1000);
      }
      for (const mark of order) expect(syntaxTree(state).toString()).toContain(mark.node + "(");
      for (const mark of [...order].reverse()) { const spec = toggleSourceMark(mark)(state); expect(spec).not.toBeNull(); state = state.update(spec!).state; ensureSyntaxTree(state, state.doc.length, 1000); }
      expect(state.doc.toString()).toBe("可以，清晰、继续。");
    });
  }
  it("allows a single table cell and rejects crossing cell boundaries", () => {
    const source = "| A | B |\n| --- | --- |\n| left | right |";
    const state = selected(source, "left");
    expect(state.update(toggleSourceMark(bold)(state)!).state.doc.toString()).toContain("| **left** | right |");
    expect(toggleSourceMark(bold)(selected(source, "left | right"))).toBeNull();
  });
  it("rejects literal code, structural markers and selections crossing paragraphs", () => {
    for (const [source, text] of [["`literal`", "literal"], ["```ts\ncode\n```", "code"], ["one\n\ntwo", "one\n\ntwo"], ["| a | b |\n| --- | --- |", "---"]]) {
      const state = selected(source!, text!);
      expect(querySourceInline(state, state.selection.main).reason).not.toBeNull();
      expect(toggleSourceMark(bold)(state)).toBeNull();
    }
  });
  it("removes a whole active mark at a caret instead of inserting literal markers", () => {
    const state = selected("可以**清晰**。", "清晰"), caret = state.update({ selection: { anchor: state.selection.main.from + 1 } }).state;
    expect(caret.update(toggleSourceMark(bold)(caret)!).state.doc.toString()).toBe("可以清晰。");
  });
  it("preserves reversed selections and applies multiple ranges atomically", () => {
    const source = "first and second";
    // Multiple cursors must be enabled by the host; the command does not add that policy.
    const multiple = EditorState.create({ doc: source, selection: EditorSelection.create([EditorSelection.range(5, 0), EditorSelection.range(10, 16)]),
      extensions: [markdown({ extensions: GFM }), EditorState.allowMultipleSelections.of(true)] });
    const spec = toggleSourceMark(bold)(multiple)!;
    const next = multiple.update(spec).state;
    expect(next.doc.toString()).toBe("**first** and **second**");
    expect(next.selection.ranges.map(range => next.sliceDoc(range.from, range.to))).toEqual(["first", "second"]);
    expect(next.selection.ranges[0]!.anchor).toBeGreaterThan(next.selection.ranges[0]!.head);
  });
  it("refuses a partial mark removal and does not serialize for availability", () => {
    const state = selected("**complete** text", "plete");
    const serialize = vi.spyOn(state.doc, "toString");
    expect(querySourceInline(state, state.selection.main).reason).toBeNull();
    expect(serialize).not.toHaveBeenCalled();
    expect(toggleSourceMark(bold)(state)).toBeNull();
  });
  it("keeps empty prose seeds editable, but refuses empty code and table syntax", () => {
    const empty = selected("", "");
    const next = empty.update(toggleSourceMark(bold)(empty)!).state;
    expect(next.doc.toString()).toBe("****"); expect(next.selection.main.head).toBe(2);
    const code = selected("```\n\n```", "").update({ selection: { anchor: 4 } }).state;
    expect(toggleSourceMark(bold)(code)).toBeNull();
    const delimiter = selected("# heading", "#");
    expect(toggleSourceMark(bold)(delimiter)).toBeNull();
  });
  it("refuses the whole command when one range is not prose", () => {
    const doc = "first\n\n`code`", state = EditorState.create({ doc,
      selection: EditorSelection.create([EditorSelection.range(0, 5), EditorSelection.range(8, 12)]),
      extensions: [markdown({ extensions: GFM }), EditorState.allowMultipleSelections.of(true)] });
    expect(toggleSourceMark(bold)(state)).toBeNull(); expect(state.doc.toString()).toBe(doc);
  });
  it("admits paragraph ends and the outer edge of code without entering literal contents", () => {
    for (const source of ["prose", "`code`", "text\n\nafter"]) {
      const at = source.indexOf("\n") < 0 ? source.length : source.indexOf("\n");
      const state = selected(source, "").update({ selection: { anchor: at } }).state;
      expect(querySourceInline(state, state.selection.main).reason, source).toBeNull();
    }
  });
});
