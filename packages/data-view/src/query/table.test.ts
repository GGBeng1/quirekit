import { expect, it } from "vitest";
import { applyDataViewOperations, createDataView, parseDataView, queryDataTable, readDataView, serializeDataView } from "../index";

it("summarizes all filtered rows before pagination and ignores missing numeric values", () => {
  const embed = createDataView("stats");
  if (embed.source.kind !== "inline") throw new Error("Expected inline");
  const value = applyDataViewOperations(embed, [
    {type: "add-field", field: {id: "cost", name: "工作量", type: "number"}, defaultValue: null},
    ...Array.from({length: 61}, (_, i) => ({type: "insert-record" as const, record: {id: `r${i}`, values: {title: String(i), status: i === 60 ? "done" : "todo", cost: i === 59 ? null : i === 60 ? 999 : 2}}}))
  ], {baseRevision: embed.source.dataset.revision, revision: "next"});
  if (value.source.kind !== "inline") throw new Error("Expected inline");
  const view = {id: "stats", name: "统计", type: "table" as const, visibleFieldIds: ["title", "cost"], query: {sort: [], filter: {fieldId: "status", op: "eq" as const, value: "todo"}}, summaries: {cost: "sum" as const}};
  const page = queryDataTable(value.source.dataset, view, {offset: 50, limit: 50});
  expect(page.records).toHaveLength(10);
  expect(page.total).toBe(60);
  expect(page.summaries.cost).toBe(118);
  expect(queryDataTable(value.source.dataset, {...view, summaries: {cost: "average"}}).summaries.cost).toBe(2);
  expect(queryDataTable(value.source.dataset, {...view, summaries: {cost: "count"}}).summaries.cost).toBe(59);
  const empty = {...view, query: {sort: [], filter: {fieldId: "title", op: "eq" as const, value: "missing"}}};
  expect(queryDataTable(value.source.dataset, empty).summaries.cost).toBe(0);
  expect(queryDataTable(value.source.dataset, {...empty, summaries: {cost: "average"}}).summaries.cost).toBeNull();
});

it("roundtrips optional styling, rejects invalid references, and repairs removed fields", () => {
  const original = createDataView("style");
  if (original.source.kind !== "inline") throw new Error("Expected inline");
  const value = readDataView({...original, views: original.views.map(view => view.type === "table"
    ? {...view, density: "compact", summaries: {title: "count"}}
    : {...view, collapsedGroups: ["done", null], showFieldNames: false})});
  expect(parseDataView(serializeDataView(value))).toEqual(value);
  expect(readDataView(original)).toEqual(original);
  for (const overrides of [{density: "tiny"}, {summaries: {title: "sum"}}, {summaries: {missing: "count"}}]) {
    expect(() => readDataView({...original, views: [{...original.views[0], ...overrides}]})).toThrow();
  }
  expect(() => readDataView({...original, views: [original.views[0], {...original.views[1], collapsedGroups: ["missing"]}]})).toThrow();
  const added = applyDataViewOperations(value, [{type: "add-field", field: {id: "n", name: "数值", type: "number"}, defaultValue: null}], {baseRevision: original.source.dataset.revision, revision: "added"});
  const configured = readDataView({...added, views: added.views.map(view => view.type === "table" ? {...view, summaries: {n: "sum"}} : view)});
  const removed = applyDataViewOperations(configured, [{type: "delete-field", fieldId: "n"}], {baseRevision: "added", revision: "removed"});
  expect(removed.views[0]).toMatchObject({summaries: {}});
});

it("retains chosen colors and clears removed collapse references atomically with schema edits", () => {
  const original = createDataView("colors");
  if (original.source.kind !== "inline") throw new Error("Expected inline");
  const data = original.source.dataset;
  const status = data.fields.find(field => field.id === "status")!;
  if (status.type !== "singleSelect") throw new Error("Expected choices");
  const configured = readDataView({...original, views: original.views.map(view => view.type === "board" ? {...view, collapsedGroups: ["done", null]} : view)});
  const next = applyDataViewOperations(configured, [{type: "replace-field", field: {...status, options: status.options.filter(option => option.id !== "done").map(option => ({...option, color: "warning"}))}}], {baseRevision: original.source.dataset.revision, revision: "changed"});
  expect(next.views[1]).toMatchObject({collapsedGroups: [null]});
  expect(parseDataView(serializeDataView(next))).toEqual(next);
  if (next.source.kind !== "inline") throw new Error("Expected inline");
  expect(next.source.dataset.fields[1]).toMatchObject({options: [{id: "todo", color: "warning"}, {id: "doing", color: "warning"}]});
  expect(() => readDataView({...original, source: {kind: "inline", dataset: {...data, fields: [data.fields[0], {...status, options: [{id: "todo", label: "待办", color: "#fff"}]}]}}})).toThrow();
  expect(configured.views[1]).toMatchObject({collapsedGroups: ["done", null]});
});
