import { expect, it } from "vitest";
import { createDataView, queryDataSet, readDataView, type DataFilter } from "@quirekit/data-view";
import { filterEntries, filterOperators, withFilterEntries } from "./model";

it("adds and removes a conjunction without flattening an imported disjunction", () => {
  const either: DataFilter = {any: [{fieldId: "status", op: "eq", value: "todo"}, {fieldId: "status", op: "eq", value: "doing"}]};
  const added: DataFilter = {fieldId: "title", op: "contains", value: "匹配"};
  const original = {sort: [], filter: either};
  const query = withFilterEntries(original, [...filterEntries(either), added]);
  const source = createDataView("filter");
  if (source.source.kind !== "inline") throw new Error("Expected inline data");
  const value = readDataView({...source, source: {kind: "inline", dataset: {...source.source.dataset, records: [
    {id: "a", values: {title: "匹配项", status: "todo"}}, {id: "b", values: {title: "其它", status: "doing"}}, {id: "c", values: {title: "匹配项", status: "done"}}
  ]}}});
  if (value.source.kind !== "inline") throw new Error("Expected inline data");
  expect(queryDataSet(value.source.dataset, query).records.map(row => row.id)).toEqual(["a"]);
  expect(withFilterEntries(query, filterEntries(query.filter).filter(rule => rule !== added))).toEqual(original);
  expect(withFilterEntries(query, [])).toEqual({sort: []});
});

it("offers numeric comparisons and excludes unsupported choice ordering", () => {
  expect(filterOperators({id: "n", name: "数值", type: "number"}).map(item => item.value)).toContain("gt");
  expect(filterOperators({id: "s", name: "选项", type: "singleSelect", options: []}).map(item => item.value)).toEqual(["eq", "neq", "isEmpty", "isNotEmpty"]);
});
