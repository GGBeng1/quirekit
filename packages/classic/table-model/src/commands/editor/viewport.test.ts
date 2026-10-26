import { createEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { WordTableExtensions } from "../../schema";
import { createWordTableMap } from "../../map";

/** @returns An editor with a remote caret before a two-by-two table. */
function fixture() {
  return createEditor({ extensions: WordTableExtensions, content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "caret" }] },
    { type: "wordTable", content: Array.from({ length: 2 }, () => ({ type: "wordTableRow", content:
      Array.from({ length: 2 }, () => ({ type: "wordTableCell", content: [{ type: "paragraph" }] }))
    })) }
  ] } });
}

describe("table sizing viewport intent", () => {
  it.each(["column", "row", "columns", "rows"] as const)("%s changes size without requesting the remote caret", axis => {
    const editor = fixture();
    const tablePos = editor.state.doc.firstChild!.nodeSize;
    const selection = editor.state.pm.selection.toJSON();
    const dispatch = editor.dispatchTransaction.bind(editor);
    const requests: boolean[] = [];
    editor.dispatchTransaction = tr => { requests.push(tr.scrolledIntoView); dispatch(tr); };
    const ok = axis === "column" ? editor.commands.setWordTableColumnWidth({ tablePos, columnIndex: 0, width: { value: 2400, unit: "dxa" } })
      : axis === "row" ? editor.commands.setWordTableRowHeight({ tablePos, rowIndex: 0, height: { value: 900, rule: "atLeast" } })
      : axis === "columns" ? editor.commands.distributeWordTableColumns({ tablePos, from: 0, to: 1, totalWidth: { value: 4800, unit: "dxa" } })
      : editor.commands.distributeWordTableRows({ tablePos, from: 0, to: 1, totalHeight: { value: 1800, rule: "atLeast" } });
    expect(ok).toBe(true);
    expect(editor.state.pm.selection.toJSON()).toEqual(selection);
    expect(requests).toEqual([false]);
    editor.destroy();
  });

  it("retains insertion navigation and an explicit caller's chained scroll request", () => {
    const editor = fixture();
    const tablePos = editor.state.doc.firstChild!.nodeSize;
    const dispatch = editor.dispatchTransaction.bind(editor);
    const requests: boolean[] = [];
    editor.dispatchTransaction = tr => { requests.push(tr.scrolledIntoView); dispatch(tr); };
    expect(editor.commands.addWordTableRow({ tablePos, rowIndex: 0, side: "after" })).toBe(true);
    expect(requests).toEqual([true]);
    expect(editor.chain().scrollIntoView().setWordTableRowHeight({ tablePos, rowIndex: 0, height: { value: 900, rule: "atLeast" } }).run()).toBe(true);
    expect(requests).toEqual([true, true]);
    editor.destroy();
  });

  it("keeps structural selection without adding scroll intent for any sizing command", () => {
    const editor = fixture();
    const tablePos = editor.state.doc.firstChild!.nodeSize;
    const map = createWordTableMap(editor.state.doc.nodeAt(tablePos)!);
    editor.commands.setWordTableSelection({ tablePos, anchorCellPos: map.explicitCells[0]!.cellPos, headCellPos: map.explicitCells.at(-1)!.cellPos });
    const selection = editor.state.pm.selection.toJSON();
    const dispatch = editor.dispatchTransaction.bind(editor);
    const requests: boolean[] = [];
    editor.dispatchTransaction = tr => { requests.push(tr.scrolledIntoView); dispatch(tr); };
    expect(editor.commands.setWordTableColumnWidth({ tablePos, columnIndex: 0, width: { value: 1800, unit: "dxa" } })).toBe(true);
    expect(editor.commands.setWordTableRowHeight({ tablePos, rowIndex: 0, height: { value: 600, rule: "atLeast" } })).toBe(true);
    expect(editor.commands.distributeWordTableColumns({ tablePos, from: 0, to: 1, totalWidth: { value: 4800, unit: "dxa" } })).toBe(true);
    expect(editor.commands.distributeWordTableRows({ tablePos, from: 0, to: 1, totalHeight: { value: 1800, rule: "atLeast" } })).toBe(true);
    expect(requests).toEqual([false, false, false, false]);
    expect(editor.state.pm.selection.toJSON()).toEqual(selection);
    editor.destroy();
  });
});
