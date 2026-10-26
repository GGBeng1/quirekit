import { describe, expect, it } from "vitest";
import { createDataView } from "../model/create";
import type { DataBoardView, DataSet } from "../model/types";
import { groupDataSet, queryDataSet } from "./execute";

/** Builds complete rows with falsey values and one unassigned record.
 * @returns Independent local query fixture.
 */
function fixture(): DataSet {
  const embed = createDataView("query");
  if (embed.source.kind !== "inline") throw new Error("Expected inline");
  return {...embed.source.dataset, fields: [...embed.source.dataset.fields, {id: "n", name: "数量", type: "number"}], records: [
    {id: "b", values: {title: "二", status: "todo", n: 0}},
    {id: "a", values: {title: "一", status: "todo", n: 3}},
    {id: "c", values: {title: "", status: null, n: null}}
  ]};
}

describe("full-data queries", () => {
  it("filters and sorts before pagination, with an exact total", () => {
    const result = queryDataSet(fixture(), {filter: {fieldId: "n", op: "gte", value: 0}, sort: [{fieldId: "n", direction: "desc", nulls: "last"}]}, {limit: 1});
    expect(result.records.map(row => row.id)).toEqual(["a"]); expect(result.total).toBe(2); expect(result.nextOffset).toBe(1);
  });
  it("keeps null placement independent from descending sort", () => {
    const result = queryDataSet(fixture(), {sort: [{fieldId: "n", direction: "desc", nulls: "first"}]});
    expect(result.records.map(row => row.id)).toEqual(["c", "a", "b"]);
  });
  it("does not treat zero as empty or include null in inequality", () => {
    expect(queryDataSet(fixture(), {sort: [], filter: {fieldId: "n", op: "isEmpty"}}).records.map(row => row.id)).toEqual(["c"]);
    expect(queryDataSet(fixture(), {sort: [], filter: {fieldId: "n", op: "neq", value: 0}}).records.map(row => row.id)).toEqual(["a"]);
  });
  it("retains empty columns and counts all matches before column pagination", () => {
    const view = createDataView("query").views[1] as DataBoardView;
    const groups = groupDataSet(fixture(), view, {limit: 1});
    expect(groups.map(group => [group.key, group.total])).toEqual([["todo", 2], ["doing", 0], ["done", 0], [null, 1]]);
    expect(groups[0]!.records).toHaveLength(1);
  });
  it("rejects stale fields and invalid page sizes", () => {
    expect(() => queryDataSet(fixture(), {sort: [{fieldId: "missing", direction: "asc", nulls: "last"}]})).toThrow();
    expect(() => queryDataSet(fixture(), {sort: []}, {limit: 0})).toThrow();
  });
});
