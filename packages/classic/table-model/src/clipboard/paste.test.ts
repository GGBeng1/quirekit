import { createEditor, type QuireJSONContent } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { Fragment, Slice, TextSelection } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { WordTableExtensions } from "../schema";
import { createWordTableMap } from "../map";
import { WordTableSelection } from "../selection";
import { parseWordTableTsv, serializeWordTableSelectionTsv } from "./tsv";

/** @param text - Cell text. @param attrs - Structural attributes. @returns Cell JSON. */
function cell(text: string, attrs: Record<string, unknown> = {}): QuireJSONContent {
  return { type: "wordTableCell", attrs: { ...attrs, colspan: attrs.gridSpan ?? 1 }, content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }] };
}

/** @param rows - Source rows. @returns Editor with a selected first cell. */
function fixture(rows = [[cell("a"), cell("b")], [cell("c"), cell("d")]]) {
  const editor = createEditor({ extensions: [...WordTableExtensions, UndoRedo], content: {
    type: "doc", content: [{ type: "wordTable", content: rows.map(content => ({ type: "wordTableRow", content })) }]
  } });
  const map = createWordTableMap(editor.state.doc.firstChild!);
  const pos = map.semanticCells[0]!.originCellPos;
  expect(editor.commands.setWordTableSelection({ tablePos: 0, anchorCellPos: pos, headCellPos: pos })).toBe(true);
  return editor;
}

describe("structural table paste", () => {
  it("routes a caret table paste through the shared input transaction without nesting", () => {
    const editor = fixture();
    const pos = createWordTableMap(editor.state.doc.firstChild!).positionAt(1, 1)!;
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, pos + 2)));
    const before = editor.state.doc;
    const slice = parseWordTableTsv({ schema: editor.schema, tsv: "A\tB\nC\tD" });
    const tr = editor.state.pm.tr;
    expect(editor.view.someProp("quireClipboardPaste", handler => handler(tr, slice, editor.view))).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(tr.doc.firstChild!.children.map(row => row.textContent)).toEqual(["ab", "cAB", "CD"]);
    expect(tr.selection).toBeInstanceOf(WordTableSelection);
    editor.destroy();
  });

  it("targets the innermost nested table without replacing its outer carrier", () => {
    const editor = fixture();
    const inner = { type: "wordTable", content: [{ type: "wordTableRow", content: [cell("inner"), cell("keep")] }] };
    const outer = { type: "wordTable", content: [{ type: "wordTableRow", content: [
      { ...cell("prefix"), content: [...cell("prefix").content!, inner] }, cell("outer")
    ] }] };
    editor.commands.setContent({ type: "doc", content: [outer] });
    let innerPos = 0;
    editor.state.doc.descendants((node, pos) => { if (node.type.name === "wordTable" && pos > 0) innerPos = pos; });
    const map = createWordTableMap(editor.state.doc.nodeAt(innerPos)!);
    editor.commands.setTextSelection(innerPos + map.positionAt(0, 0)! + 2);
    const tr = editor.state.pm.tr;
    const slice = parseWordTableTsv({ schema: editor.schema, tsv: "A\tB" });
    expect(editor.view.someProp("quireClipboardPaste", handler => handler(tr, slice, editor.view))).toBe(true);
    expect(tr.doc.firstChild!.textContent).toBe("prefixABouter");
    expect((tr.selection as WordTableSelection).tablePos).toBe(innerPos);
    expect(tr.doc.firstChild!.child(0).childCount).toBe(2);
    editor.destroy();
  });

  it("rejects incompatible caret paste without changing the original text selection", () => {
    const editor = fixture([[cell("keep", { gridSpan: 2 })]]);
    editor.commands.setTextSelection(4);
    const selection = editor.state.pm.selection;
    const tr = editor.state.pm.tr;
    const slice = parseWordTableTsv({ schema: editor.schema, tsv: "A\tB" });
    expect(editor.view.someProp("quireClipboardPaste", handler => handler(tr, slice, editor.view))).toBe(true);
    expect(tr.getMeta("preventDispatch")).toBe(true);
    expect(tr.selection.eq(selection)).toBe(true);
    expect(tr.steps).toHaveLength(0);
    editor.destroy();
  });

  it.each(["ordinary", "first\nsecond", '"a\tb"'])("keeps caret plain text literal: %s", text => {
    const editor = fixture();
    editor.commands.setTextSelection(4);
    expect(editor.view.someProp("clipboardTextParser", parser => (parser as (text: string) => Slice | null)(text))).toBeFalsy();
    editor.destroy();
  });

  it("classifies actual TSV columns at a caret, but not a text range", () => {
    const editor = fixture();
    editor.commands.setTextSelection(4);
    const parse = () => editor.view.someProp("clipboardTextParser", parser => (parser as (text: string) => Slice | null)("A\tB"));
    expect(parse()?.content.firstChild?.type.name).toBe("wordTable");
    editor.commands.setTextSelection({ from: 3, to: 4 });
    expect(parse()).toBeFalsy();
    editor.destroy();
  });
  it("expands from one selected cell without nesting or losing outside contents, with one undo", () => {
    const editor = fixture();
    const map = createWordTableMap(editor.state.doc.firstChild!);
    const pos = map.positionAt(1, 1)!;
    expect(editor.commands.setWordTableSelection({ tablePos: 0, anchorCellPos: pos, headCellPos: pos })).toBe(true);
    const before = editor.state.doc;
    const tr = editor.state.pm.tr.replaceSelection(parseWordTableTsv({ schema: editor.schema, tsv: "A\tB\nC\tD" }));
    const table = tr.doc.firstChild!;
    expect(table.children.map(row => row.childCount)).toEqual([3, 3, 3]);
    expect(table.child(0).textContent).toBe("ab");
    expect(table.child(1).textContent).toBe("cAB");
    expect(table.child(2).textContent).toBe("CD");
    expect(tr.selection).toBeInstanceOf(WordTableSelection);
    expect((tr.selection as WordTableSelection).rect).toEqual({ startRow: 1, startColumn: 1, rowSpan: 2, columnSpan: 2 });
    expect(createWordTableMap(table).diagnostics).toEqual([]);
    editor.dispatchTransaction(tr);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.eq(before)).toBe(true);
    editor.destroy();
  });

  it("overwrites only the input extent of a reverse larger selection", () => {
    const editor = fixture();
    const map = createWordTableMap(editor.state.doc.firstChild!);
    editor.commands.setWordTableSelection({ tablePos: 0, anchorCellPos: map.positionAt(1, 1)!, headCellPos: map.positionAt(0, 0)! });
    const tr = editor.state.pm.tr.replaceSelection(parseWordTableTsv({ schema: editor.schema, tsv: "X" }));
    expect(tr.doc.firstChild!.textContent).toBe("Xbcd");
    expect((tr.selection as WordTableSelection).rect).toEqual({ startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 });
    editor.destroy();
  });

  it("rejects equal cell counts with different merge geometry atomically", () => {
    const editor = fixture([[cell("left", { gridSpan: 2 }), cell("right")]]);
    const map = createWordTableMap(editor.state.doc.firstChild!);
    editor.commands.setWordTableSelection({ tablePos: 0, anchorCellPos: map.positionAt(0, 0)!, headCellPos: map.positionAt(0, 2)! });
    const source = editor.schema.nodeFromJSON({ type: "wordTable", content: [{ type: "wordTableRow", content: [cell("X"), cell("Y", { gridSpan: 2 })] }] });
    const tr = editor.state.pm.tr.replaceSelection(new Slice(Fragment.from(source), 0, 0));
    expect(tr.steps).toHaveLength(0);
    expect(tr.getMeta("preventDispatch")).toBe(true);
    expect(tr.getMeta("quirekit:word-table-paste")).toMatchObject({ status: "rejected", reason: "incompatible-merge" });
    expect(tr.doc).toBe(editor.state.doc);
    editor.destroy();
  });

  it("pastes matching merged bodies while retaining target container properties", () => {
    const editor = fixture([[cell("old", { gridSpan: 2, verticalAlign: "bottom" }), cell("outside")]]);
    const source = editor.schema.nodeFromJSON({ type: "wordTable", content: [{ type: "wordTableRow", content: [cell("new", { gridSpan: 2 })] }] });
    const tr = editor.state.pm.tr.replaceSelection(new Slice(Fragment.from(source), 0, 0));
    expect(tr.doc.firstChild!.child(0).child(0).attrs.verticalAlign).toBe("bottom");
    expect(tr.doc.firstChild!.textContent).toBe("newoutside");
    expect(tr.selection).toBeInstanceOf(WordTableSelection);
    editor.destroy();
  });

  it("does not flatten a merged destination to fit a unit matrix", () => {
    const editor = fixture([[cell("keep", { gridSpan: 2 })]]);
    const tr = editor.state.pm.tr.replaceSelection(parseWordTableTsv({ schema: editor.schema, tsv: "x\ty" }));
    expect(tr.steps).toHaveLength(0);
    expect(tr.getMeta("preventDispatch")).toBe(true);
    editor.destroy();
  });

  it("preserves a matching vertical chain and outside bodies", () => {
    const editor = fixture([[cell("old", { vMerge: "restart", rowspan: 2 }), cell("right")],
      [cell("", { vMerge: "continue" }), cell("outside")]]);
    const source = editor.schema.nodeFromJSON({ type: "wordTable", content: [
      { type: "wordTableRow", content: [cell("new", { vMerge: "restart", rowspan: 2 })] },
      { type: "wordTableRow", content: [cell("", { vMerge: "continue" })] }
    ] });
    const tr = editor.state.pm.tr.replaceSelection(new Slice(Fragment.from(source), 0, 0));
    expect(tr.getMeta("preventDispatch")).toBeUndefined();
    expect(tr.doc.firstChild!.textContent).toBe("newrightoutside");
    expect(tr.doc.firstChild!.child(1).child(0).attrs.vMerge).toBe("continue");
    expect(createWordTableMap(tr.doc.firstChild!).diagnostics).toEqual([]);
    expect((tr.selection as WordTableSelection).rect).toEqual({ startRow: 0, startColumn: 0, rowSpan: 2, columnSpan: 1 });
    editor.destroy();
  });

  it("does not collapse omitted source grid columns into a rectangular matrix", () => {
    const editor = fixture();
    const source = editor.schema.nodeFromJSON({ type: "wordTable", content: [
      { type: "wordTableRow", attrs: { gridBefore: 1 }, content: [cell("X")] }
    ] });
    expect(createWordTableMap(source).diagnostics).toEqual([]);
    const tr = editor.state.pm.tr.replaceSelection(new Slice(Fragment.from(source), 0, 0));
    expect(tr.getMeta("preventDispatch")).toBe(true);
    expect(tr.steps).toHaveLength(0);
    editor.destroy();
  });

  it("parses quoted tabs, line breaks and quotes, pads short rows, and round trips TSV", () => {
    const editor = fixture();
    const slice = parseWordTableTsv({ schema: editor.schema, tsv: '"a\tb"\t"line1\nline2"\r\n"say ""hi"""\r\n' });
    const source = slice.content.firstChild!;
    expect(source.children.map(row => row.childCount)).toEqual([2, 2]);
    expect(source.child(0).child(0).textContent).toBe("a\tb");
    expect(source.child(0).child(1).childCount).toBe(2);
    expect(source.child(1).child(0).textContent).toBe('say "hi"');
    const doc = editor.schema.nodes.doc!.create(null, source);
    const map = createWordTableMap(source);
    const selection = WordTableSelection.create(doc, { tablePos: 0, anchorCellPos: map.positionAt(0, 0)!, headCellPos: map.positionAt(1, 1)! });
    const reparsed = parseWordTableTsv({ schema: editor.schema, tsv: serializeWordTableSelectionTsv(selection) });
    expect(reparsed.eq(slice)).toBe(true);
    editor.destroy();
  });
});
