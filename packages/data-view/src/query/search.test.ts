import { expect, it } from "vitest";
import { applyDataViewOperations, createDataView, groupDataSet, queryDataSet, queryDataTable, serializeDataView } from "../index";

/** @returns Complete data with labels, hidden fields and more than one page. */
function fixture() {
  const initial = createDataView("search");
  if (initial.source.kind !== "inline") throw new Error("Expected inline data");
  const value = applyDataViewOperations(initial, [
    {type: "add-field", field: {id: "notes", name: "备注", type: "text"}, defaultValue: null},
    {type: "add-field", field: {id: "effort", name: "工作量", type: "number"}, defaultValue: null},
    ...Array.from({length: 61}, (_, index) => ({type: "insert-record" as const, record: {id: `r${index}`, values: {
      title: index === 60 ? "Other" : "ＡＰＩ 设计", status: index === 60 ? "done" : "todo", notes: "隐藏备注 [test]", effort: 2
    }}}))
  ], {baseRevision: initial.source.dataset.revision, revision: "ready"});
  if (value.source.kind !== "inline") throw new Error("Expected inline data");
  return {value, data: value.source.dataset};
}

it("searches complete displayed values before pages, groups and aggregates without persisting a filter", () => {
  const {value, data} = fixture(), before = serializeDataView(value);
  const table = {...value.views[0]!, type: "table" as const, summaries: {effort: "sum" as const}};
  const result = queryDataTable(data, table, {search: " api ", offset: 50, limit: 50});
  expect(result.total).toBe(60);
  expect(result.records).toHaveLength(10);
  expect(result.summaries.effort).toBe(120);
  const board = value.views.find(view => view.type === "board")!;
  expect(groupDataSet(data, board, {search: "API", limit: 1}).map(group => group.total)).toEqual([60, 0, 0, 0]);
  expect(queryDataSet(data, {sort: []}, {search: "完成"}).records.map(row => row.id)).toEqual(["r60"]);
  expect(queryDataSet(data, {sort: []}, {search: "隐藏备注"}).total).toBe(61);
  expect(queryDataSet(data, {sort: []}, {search: "[test]"}).total).toBe(61);
  expect(queryDataSet(data, {sort: []}, {search: "2"}).total).toBe(61);
  expect(queryDataSet(data, {sort: []}, {search: "   "}).total).toBe(61);
  expect(queryDataSet(data, {sort: [], filter: {fieldId: "status", op: "eq", value: "done"}}, {search: "api"}).total).toBe(0);
  expect(serializeDataView(value)).toBe(before);
});

it("rejects oversized and non-string search options without changing source data", () => {
  const {data} = fixture();
  expect(() => queryDataSet(data, {sort: []}, {search: "x".repeat(257)})).toThrow();
  expect(() => queryDataSet(data, {sort: []}, {search: null as unknown as string})).toThrow();
});
