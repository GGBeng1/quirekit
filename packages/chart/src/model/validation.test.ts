import { describe, expect, it } from "vitest";
import { assertChartSpec, createChartSpec } from "../index";

describe("portable chart model", () => {
  it("rejects XML-ineligible labels before chart/cache/workbook preparation", () => {
    const raw = JSON.parse(JSON.stringify(createChartSpec("column", "labels")));
    raw.data.rows[0].values.category = "允许换行\n及 emoji 😀";
    expect(() => assertChartSpec(raw)).not.toThrow();
    raw.data.rows[0].values.category = "bad\u0000";
    expect(() => assertChartSpec(raw)).toThrow();
    raw.data.rows[0].values.category = "bad\ud800";
    expect(() => assertChartSpec(raw)).toThrow();
  });
  it("detaches input authority and preserves null and stable bindings", () => {
    const input = createChartSpec("column", "chart-1");
    const raw = JSON.parse(JSON.stringify(input));
    raw.data.rows[1].values[raw.series[0].valueColumn] = null;
    const spec = assertChartSpec(raw);
    raw.data.rows[0].values[raw.series[0].valueColumn] = 999;
    expect(spec.data.rows[0]!.values[spec.series[0]!.valueColumn]).not.toBe(999);
    expect(spec.data.rows[1]!.values[spec.series[0]!.valueColumn]).toBeNull();
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec);
  });

  it.each(["binding", "duplicate-row", "infinity", "numeric-string", "unknown-field", "version", "empty", "budget"])(
    "rejects %s before a renderer sees the data", failure => {
      const input = JSON.parse(JSON.stringify(createChartSpec("column", "chart-1")));
      if (failure === "binding") input.series[0].valueColumn = "missing";
      if (failure === "duplicate-row") input.data.rows[1].id = input.data.rows[0].id;
      if (failure === "infinity") input.data.rows[0].values[input.series[0].valueColumn] = Infinity;
      if (failure === "numeric-string") input.data.rows[0].values[input.series[0].valueColumn] = "12";
      if (failure === "unknown-field") input.option = {};
      if (failure === "version") input.version = 99;
      if (failure === "empty") input.data.rows = [];
      if (failure === "budget") input.data.rows = Array.from({ length: 1001 }, (_, i) => ({ ...input.data.rows[0], id: String(i) }));
      expect(() => assertChartSpec(input)).toThrow();
    }
  );

  it.each(["negative", "zero", "multiple"])("rejects an invalid pie: %s", failure => {
    const input = JSON.parse(JSON.stringify(createChartSpec("pie", "pie-1")));
    if (failure === "negative") input.data.rows[0].values[input.series[0].valueColumn] = -1;
    if (failure === "zero") for (const row of input.data.rows) row.values[input.series[0].valueColumn] = 0;
    if (failure === "multiple") input.series.push({ ...input.series[0], id: "extra" });
    expect(() => assertChartSpec(input)).toThrow();
  });
});
