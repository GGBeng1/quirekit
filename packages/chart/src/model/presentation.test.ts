import { describe, expect, it } from "vitest";
import { assertChartSpec } from "./validation";
import { createChartSpec } from "./preset";
import { changeChartFamily, changeChartGrouping } from "./change";

describe("current basic chart authoring", () => {
  it.each(["version", "preset", "grouping", "presentation"] as const)("rejects %s mismatches instead of migrating a development structure", failure => {
    const input = JSON.parse(JSON.stringify(createChartSpec("column", "current")));
    input.version = 1; input.style.presetId = "simple-1";
    if (failure === "version") input.version = 2;
    if (failure === "preset") input.style.presetId = "simple-2";
    if (failure === "grouping") delete input.grouping;
    if (failure === "presentation") delete input.presentation;
    expect(() => assertChartSpec(input)).toThrow(failure === "version" ? "chart-version-unsupported" : undefined);
  });
  it.each(["column", "bar", "line", "area", "pie", "doughnut"] as const)("round-trips a complete version 1 %s preset without aliases", type => {
    const spec = createChartSpec(type, type), restored = assertChartSpec(JSON.parse(JSON.stringify(spec)));
    expect(restored).toEqual(spec); expect(restored).not.toBe(spec);
    expect(restored.data).not.toBe(spec.data); expect(restored.presentation).not.toBe(spec.presentation);
    expect(restored.version).toBe(1); expect(restored.style.presetId).toBe("simple-1");
    expect(spec.blankPolicy).toBe(type === "area" ? "zero" : "gap");
    expect(spec.series.length).toBe(["pie", "doughnut"].includes(type) ? 1 : 2);
  });
  it("switches the entire plot tuple and never truncates multiple series implicitly", () => {
    const before = createChartSpec("column", "switch");
    expect(() => changeChartFamily(before, "pie")).toThrow("single-series");
    const area = changeChartFamily(before, "area"); expect(area.data).toEqual(before.data); expect(area.blankPolicy).toBe("zero");
    const stacked = changeChartGrouping(changeChartFamily(area, "line"), "stacked");
    expect(stacked.blankPolicy).toBe("zero"); expect(changeChartGrouping(stacked, "standard").blankPolicy).toBe("gap");
    expect(() => changeChartGrouping(createChartSpec("doughnut", "ring"), "stacked")).toThrow();
  });
  it("rejects unknown presentation, invalid mixed presets, negative stacking and unbounded cumulative values", () => {
    for (const failure of ["field", "title", "legend", "axis", "negative", "overflow"] as const) {
      const value = JSON.parse(JSON.stringify(createChartSpec("column", "bad")));
      if (failure === "field") value.presentation.option = {};
      if (failure === "title") value.presentation.title = "bad\u0000";
      if (failure === "legend") value.presentation.legend = "float";
      if (failure === "axis") value.presentation.valueAxis = "yes";
      if (failure === "negative") { value.grouping = "stacked"; value.data.rows[0].values["value-1"] = -1; }
      if (failure === "overflow") { value.grouping = "percentStacked"; value.data.rows[0].values["value-1"] = 1e308; value.data.rows[0].values["value-2"] = 1e308; }
      expect(() => assertChartSpec(value)).toThrow();
    }
  });
});
