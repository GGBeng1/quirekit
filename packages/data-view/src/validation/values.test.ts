import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { readDataView, readDataSet } from "../codec/json";
import { createDataView } from "../model/create";
import type { DataField, DataValue } from "../model/types";
import { checkCell } from "./fields";

describe("data value preservation", () => {
  it.each([
    ["number", 0, true], ["number", null, true], ["number", "0", false], ["number", Number.MAX_SAFE_INTEGER + 1, false],
    ["boolean", false, true], ["boolean", 0, false], ["text", "", true], ["text", "  ", true],
    ["date", "2024-02-29", true], ["date", "2025-02-29", false], ["date", "2026-04-31", false],
    ["datetime", "2026-10-18T08:00:00+08:00", true], ["datetime", "2026-10-18T08:00:00", false],
    ["datetime", "2026-10-18T25:00:00Z", false]
  ])("checks %s value %s", (type, value, valid) => {
    const check = () => checkCell({id: "f", name: "字段", type} as DataField, value, "$.value");
    if (valid) expect(check).not.toThrow(); else expect(check).toThrow();
  });
  it("checks multiple choices independently from null and an empty selection", () => {
    const field: DataField = {id: "f", name: "标签", type: "multiSelect", options: [{id: "a", label: "A"}]};
    for (const value of [null, [], ["a"]] as DataValue[]) expect(() => checkCell(field, value, "$.value")).not.toThrow();
    for (const value of [["a", "a"], ["missing"], "a"]) expect(() => checkCell(field, value, "$.value")).toThrow();
  });
  it("loads all persisted protocol examples with the actual codec", () => {
    const examples = JSON.parse(readFileSync(new URL("../../test-support/protocol-examples.json", import.meta.url), "utf8"));
    expect(readDataSet(examples.dataset)).toEqual(examples.dataset);
    for (const kind of ["inline", "resource", "remote"]) expect(readDataView(examples[kind])).toEqual(examples[kind]);
  });
  it("rejects cycles, accessors and oversized inline source", () => {
    const value = createDataView("safe");
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    expect(() => readDataView({...value, extensions: {"example.cycle": cycle}})).toThrow(/Cyclic/);
    let calls = 0;
    const accessor = Object.defineProperty({}, "secret", {enumerable: true, get() {calls++; return "x";}});
    expect(() => readDataView({...value, extensions: {"example.accessor": accessor}})).toThrow(/Accessors/); expect(calls).toBe(0);
    expect(() => readDataView({...value, extensions: {"example.large": "x".repeat(4 * 1024 * 1024)}})).toThrow(/4 MiB/);
  });
});
