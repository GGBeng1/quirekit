import { describe, expect, it } from "vitest";
import type { QuireJSONContent } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { readWordRevisionOwnerReplacement } from "@quirekit/classic-revision-contract";
import { addWordTableColumn } from "../../column";
import { addWordTableRow } from "../../row";
import { createMinimalWordTableSteps, replaceWordTableNode } from "./replace";
import {
  captureTransaction,
  createStepEditor,
  createTextTable,
  describeSteps,
  findDiscontinuousTexts,
  findTablePos,
  findText
} from "./testing";

describe("Word table step granularity", () => {
  it("keeps the whole-table replacement available as the discontinuous control", () => {
    const editor = createStepEditor(createTextTable(2, 2));
    const tablePos = findTablePos(editor.state.doc);
    const previous = editor.state.doc.nodeAt(tablePos)!;
    const result = addWordTableRow(previous, { rowIndex: 0, side: "after" });
    if (!result.ok) throw new Error("Row insertion failed.");
    const tr = editor.state.pm.tr;

    replaceWordTableNode(tr, tablePos, previous, result.value, "whole-table");

    expect(describeSteps(tr)).toEqual(["doc@1 -1 +wordTable"]);
    expect(findDiscontinuousTexts(tr, ["R0C0", "R1C1"])).toEqual(["R0C0", "R1C1"]);
    expect(readWordRevisionOwnerReplacement(tr)).toBeUndefined();
  });

  it("falls back to one replacement when no minimal steps reproduce the result", () => {
    const editor = createStepEditor(createTextTable(1, 1));
    const tablePos = findTablePos(editor.state.doc);
    const previous = editor.state.doc.nodeAt(tablePos)!;
    const paragraph = editor.state.schema.nodes.paragraph!.create();
    const tr = editor.state.pm.tr;

    expect(createMinimalWordTableSteps(tr.doc, tablePos, previous, paragraph)).toBeNull();
    replaceWordTableNode(tr, tablePos, previous, paragraph, "minimal");
    expect(describeSteps(tr)).toEqual(["doc@1 -1 +paragraph"]);
    expect(readWordRevisionOwnerReplacement(tr)).toBeUndefined();
  });

  it("keeps the first declaration when a chain realizes two table results", () => {
    const editor = createStepEditor(createTextTable(2, 2));
    const tablePos = findTablePos(editor.state.doc);
    const tr = editor.state.pm.tr;
    const first = addWordTableRow(tr.doc.nodeAt(tablePos)!, { rowIndex: 0, side: "after" });
    if (!first.ok) throw new Error("Row insertion failed.");
    replaceWordTableNode(tr, tablePos, tr.doc.nodeAt(tablePos)!, first.value, "minimal");
    const second = addWordTableColumn(tr.doc.nodeAt(tablePos)!, { columnIndex: 0, side: "after" });
    if (!second.ok) throw new Error("Column insertion failed.");
    replaceWordTableNode(tr, tablePos, tr.doc.nodeAt(tablePos)!, second.value, "minimal");

    expect(tr.steps.length).toBeGreaterThan(1);
    expect(readWordRevisionOwnerReplacement(tr)).toEqual({
      from: tablePos,
      firstStep: 0,
      stepCount: 1
    });
  });
});

describe("Word table minimal steps over merged and offset grids", () => {
  it("extends a vertical merge chain with one row and the origin span", () => {
    const editor = createStepEditor(createTextTable(3, 2, {
      "0:0": { attrs: { vMerge: "restart", rowspan: 2 } },
      "1:0": { attrs: { vMerge: "continue", rowspan: 1 }, empty: true }
    }));
    const tablePos = findTablePos(editor.state.doc);
    const tr = captureTransaction(editor, () => editor.commands.addWordTableRow({
      tablePos,
      rowIndex: 0,
      side: "after"
    }));

    expect(describeSteps(tr)).toEqual(["table@1 -0 +wordTableRow", "c0.0.rowspan"]);
    expect(findDiscontinuousTexts(tr, ["R0C0", "R0C1", "R1C1", "R2C0", "R2C1"])).toEqual([]);
  });

  it("promotes the surviving continuation when its restart row is deleted", () => {
    const editor = createStepEditor(createTextTable(3, 2, {
      "0:0": { attrs: { vMerge: "restart", rowspan: 2 } },
      "1:0": { attrs: { vMerge: "continue", rowspan: 1 }, empty: true }
    }));
    const tablePos = findTablePos(editor.state.doc);
    const tr = captureTransaction(editor, () => editor.commands.deleteWordTableRows({
      tablePos,
      from: 0
    }));

    expect(describeSteps(tr)).toEqual(["c1.0.vMerge", "table@0 -1 +"]);
    expect(findDiscontinuousTexts(tr, ["R1C1", "R2C0", "R2C1"])).toEqual([]);
  });

  it("widens a horizontal merge instead of inserting beside it", () => {
    const editor = createStepEditor(createTextTable(2, 3, {
      "0:0": { attrs: { gridSpan: 2, colspan: 2 } },
      "0:1": null
    }));
    const tablePos = findTablePos(editor.state.doc);
    const tr = captureTransaction(editor, () => editor.commands.addWordTableColumn({
      tablePos,
      columnIndex: 0,
      side: "after"
    }));

    expect(describeSteps(tr)).toEqual([
      "table.grid",
      "r1@1 -0 +wordTableCell",
      "c0.0.colspan",
      "c0.0.gridSpan"
    ]);
    expect(findDiscontinuousTexts(tr, ["R0C0", "R0C2", "R1C0", "R1C1", "R1C2"])).toEqual([]);
  });

  it("grows a leading row offset instead of inserting a cell into it", () => {
    const table = createTextTable(2, 2, { "0:0": null });
    const rows = table.content as QuireJSONContent[];
    rows[0] = { ...rows[0]!, attrs: { gridBefore: 1 } };
    const editor = createStepEditor(table);
    const tablePos = findTablePos(editor.state.doc);
    const tr = captureTransaction(editor, () => editor.commands.addWordTableColumn({
      tablePos,
      columnIndex: 0,
      side: "before"
    }));

    expect(describeSteps(tr)).toEqual([
      "table.grid",
      "r1@0 -0 +wordTableCell",
      "r0.gridBefore"
    ]);
    expect(findDiscontinuousTexts(tr, ["R0C1", "R1C0", "R1C1"])).toEqual([]);
  });

  it("narrows merged cells with attributes alone when a column lies inside them", () => {
    const editor = createStepEditor(createTextTable(2, 3, {
      "0:0": { attrs: { gridSpan: 2, colspan: 2 } },
      "0:1": null,
      "1:0": { attrs: { gridSpan: 2, colspan: 2 } },
      "1:1": null
    }));
    const tablePos = findTablePos(editor.state.doc);
    const tr = captureTransaction(editor, () => editor.commands.deleteWordTableColumns({
      tablePos,
      from: 1
    }));

    expect(describeSteps(tr)).toEqual([
      "table.grid",
      "c1.0.colspan",
      "c1.0.gridSpan",
      "c0.0.colspan",
      "c0.0.gridSpan"
    ]);
  });

  it("appends a row from the last cell with one insertion step", () => {
    const editor = createStepEditor(createTextTable(2, 2));
    const tablePos = findTablePos(editor.state.doc);
    editor.view.dispatch(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.doc, findText(editor.state.doc, "R1C1") + 1)
    ));
    const tr = captureTransaction(editor, () => editor.commands.moveToWordTableCell("forward"));

    expect(describeSteps(tr)).toEqual(["table@2 -0 +wordTableRow"]);
    expect(readWordRevisionOwnerReplacement(tr)).toEqual({
      from: tablePos,
      firstStep: 0,
      stepCount: 1
    });
    expect(editor.state.pm.selection.$from.node(-2).type.name).toBe("wordTableRow");
  });
});
