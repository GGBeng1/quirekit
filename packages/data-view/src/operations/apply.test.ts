import { describe, expect, it } from "vitest";
import { createDataView } from "../model/create";
import { applyDataViewOperations, replaceDataView } from "./apply";
import { queryDataSet } from "../query/execute";

describe("atomic domain operations", () => {
  it("updates both projections through the same dataset and leaves the input unchanged", () => {
    const original = createDataView("a");
    const result = applyDataViewOperations(original, [{type: "insert-record", record: {id: "r", values: {title: "任务", status: "todo"}}}], {baseRevision: "a:initial", revision: "rev1"});
    const moved = applyDataViewOperations(result, [{type: "set-cell", recordId: "r", fieldId: "status", value: "done"}], {baseRevision: "rev1", revision: "rev2"});
    if (moved.source.kind !== "inline" || original.source.kind !== "inline") throw new Error("Expected inline");
    expect(queryDataSet(moved.source.dataset, moved.views[0]!.query).records[0]!.values.status).toBe("done");
    expect(original.source.dataset.records).toEqual([]);
  });
  it("rejects a batch without leaking earlier successful changes", () => {
    const original = createDataView("a");
    expect(() => applyDataViewOperations(original, [
      {type: "insert-record", record: {id: "r", values: {title: "first", status: "todo"}}},
      {type: "set-cell", recordId: "missing", fieldId: "title", value: "bad"}
    ], {baseRevision: "a:initial", revision: "rev1"})).toThrow();
    expect(original).toEqual(createDataView("a"));
  });
  it("refuses stale revisions and dangling board groups", () => {
    expect(() => applyDataViewOperations(createDataView("a"), [{type: "delete-field", fieldId: "status"}], {baseRevision: "stale", revision: "rev1"})).toThrow(/changed/);
    expect(() => applyDataViewOperations(createDataView("a"), [{type: "delete-field", fieldId: "status"}], {baseRevision: "a:initial", revision: "rev1"})).toThrow(/replacement/);
  });
  it("repairs filters, widths and visible fields atomically with field removal", () => {
    let value = applyDataViewOperations(createDataView("a"), [{type: "add-field", field: {id: "n", name: "数量", type: "number"}, defaultValue: null}], {baseRevision: "a:initial", revision: "rev1"});
    value = replaceDataView(value, {id: "table", name: "表格", type: "table", visibleFieldIds: ["title", "n"], columnWidths: {n: 100}, query: {sort: [{fieldId: "n", direction: "asc", nulls: "last"}], filter: {fieldId: "n", op: "gte", value: 0}}});
    const result = applyDataViewOperations(value, [{type: "delete-field", fieldId: "n"}], {baseRevision: "rev1", revision: "rev2"});
    expect(result.views[0]).toMatchObject({visibleFieldIds: ["title"], columnWidths: {}, query: {sort: []}});
    expect(result.views[0]!.query.filter).toBeUndefined();
  });
});
