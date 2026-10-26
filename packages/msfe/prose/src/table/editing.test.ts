import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { GFM } from "@quirekit/lezer-markdown";
import { insertTableColumn, deleteTableColumn, insertTableRow, deleteTableRow, moveTableCell } from "./commands";
import { setTableColumnAlignment } from "./alignment";

/** @param doc - Original Markdown. @param text - Caret landmark. @returns Canonical test state. */
function state(doc: string, text: string): EditorState {
  return EditorState.create({ doc, selection: { anchor: doc.indexOf(text) }, extensions: markdown({ extensions: GFM }) });
}
const source = "before\n\n> | A | B |\n> | :--- | ---: |\n> | a\\|b | c |\n> | short |\n\nafter";

describe("table source commands", () => {
  it("changes only the selected delimiter field, including quoted tables and escaped cell pipes", () => {
    const before = state(source, "c |");
    const after = before.update(setTableColumnAlignment("center")(before)!).state;
    expect(after.doc.toString()).toBe(source.replace("| ---: |", "| :---: |"));
    expect(after.sliceDoc(after.selection.main.from, after.selection.main.from + 1)).toBe("c");
    expect(after.update(setTableColumnAlignment("default")(after)!).state.doc.toString()).toBe(source.replace("| ---: |", "| --- |"));
    expect(setTableColumnAlignment("left")(state("text", "text"))).toBeNull();
  });
  it("navigates actual cells and materializes only the requested missing column", () => {
    let current = state(source, "short");
    const spec = moveTableCell(1)(current)!;
    expect(spec).not.toBeNull(); current = current.update(spec).state;
    expect(current.doc.toString()).toContain("> | short | |\n");
    expect(current.doc.lineAt(current.selection.main.head).text).toBe("> | short | |");
    current = current.update(moveTableCell(1)(current)!).state;
    expect(current.doc.toString()).toContain("> | short | |\n> |  |  |\n");
    expect(moveTableCell(-1)(state(source, "A"))).toBeNull();
  });
  it("inserts and deletes columns without splitting escaped pipes or dropping surplus cells", () => {
    const current = state(source.replace("| short |", "| short | b | extra |"), "a\\|b");
    const inserted = current.update(insertTableColumn("after")(current)!).state;
    expect(inserted.doc.toString()).toContain("> | :--- | --- | ---: |");
    expect(inserted.doc.toString()).toContain("> | a\\|b |  | c |");
    expect(inserted.doc.toString()).toContain("> | short |  | b | extra |");
    expect(inserted.update(deleteTableColumn()(inserted)!).state.doc.toString()).toBe(current.doc.toString());
  });
  it("retains container prefixes and forbids deleting the header or final column", () => {
    let current = state(source, "c |");
    current = current.update(insertTableRow("before")(current)!).state;
    expect(current.doc.toString()).toContain("> | :--- | ---: |\n> |  |  |\n> | a\\|b | c |");
    expect(current.update(deleteTableRow()(current)!).state.doc.toString()).toBe(source);
    expect(deleteTableRow()(state(source, "A"))).toBeNull();
    expect(deleteTableColumn()(state("| H |\n| --- |\n| a |", "a"))).toBeNull();
  });
  it("refuses ambiguous multi-selection and incomplete non-table input", () => {
    let current = state(source, "A");
    current = current.update({ selection: EditorSelection.range(source.indexOf("A"), source.indexOf("c |")) }).state;
    expect(insertTableColumn("before")(current)).toBeNull();
    expect(insertTableRow("after")(state("ordinary text", "text"))).toBeNull();
  });
  it("deleting the final selected column keeps the caret in the remaining cell", () => {
    const before = state(source, "c |");
    const after = before.update(deleteTableColumn()(before)!).state;
    const line = after.doc.lineAt(after.selection.main.head);
    expect(line.text).toBe("> | a\\|b |");
    expect(after.selection.main.head).toBe(line.from + 4);
  });
});
