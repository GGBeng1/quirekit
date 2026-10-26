import { describe, expect, it } from "vitest";
import { createDataView } from "../model/create";
import { parseDataView, readDataView, serializeDataView, dataViewMarkdown } from "../codec/json";

describe("portable data views", () => {
  it("roundtrips both views and keeps independent object ownership", () => {
    const original = createDataView("doc");
    const copy = readDataView(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(parseDataView(serializeDataView(copy))).toEqual(original);
  });
  it.each([
    ["unknown version", (x: any) => { x.version = 2; }],
    ["unknown property", (x: any) => { x.token = "secret"; }],
    ["bad default view", (x: any) => { x.defaultViewId = "missing"; }],
    ["duplicate field", (x: any) => { x.source.dataset.fields.push(x.source.dataset.fields[0]); }],
    ["bad board group", (x: any) => { x.views[1].groupBy = "title"; }],
    ["bad option value", (x: any) => { x.source.dataset.records.push({id: "r", values: {title: "x", status: "missing"}}); }],
    ["missing cell", (x: any) => { x.source.dataset.records.push({id: "r", values: {title: "x"}}); }],
    ["invalid numeric comparison", (x: any) => { x.views[0].query.filter = {fieldId: "title", op: "lt", value: 1}; }]
  ])("rejects %s without mutating the input", (_name, mutate) => {
    const value = createDataView("doc"); mutate(value);
    const before = JSON.stringify(value);
    expect(() => readDataView(value)).toThrow();
    expect(JSON.stringify(value)).toBe(before);
  });
  it("preserves unknown metadata while rejecting behavior hidden in unknown fields", () => {
    const value = {...createDataView("doc"), extensions: {"example.notes": {content: "保留"}}};
    expect(parseDataView(serializeDataView(value))).toEqual(value);
  });
  it("cannot close its own Markdown fence from a cell", () => {
    const value = createDataView("doc");
    const malicious = {...value, views: value.views.map(view => ({...view, name: "```\n# 内容"}))};
    const markdown = dataViewMarkdown(malicious);
    expect(markdown.split("\n").filter(line => /^`{3,}$/.test(line))).toHaveLength(1);
    expect(markdown).not.toContain("```\\n");
  });
  it("checks remote descriptors without claiming their field bindings are loaded", () => {
    const value = {...createDataView("doc"), source: {kind: "remote", provider: "host", datasetId: "data"}};
    expect(readDataView(value)).toEqual(value);
    expect(() => readDataView({...value, source: {...value.source, headers: {Authorization: "secret"}}})).toThrow();
  });
});
