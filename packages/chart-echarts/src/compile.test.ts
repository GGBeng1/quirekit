import { describe, expect, it } from "vitest";
import { assertChartSpec, changeChartGrouping, createChartSpec } from "@quirekit/chart";
import { compileChartOption } from "./compile";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { chartPlotInsets } from "./presentation";

describe("static simple-1 compiler", () => {
  it("keeps nulls as gaps and disables animation and legend mutation", () => {
    const spec = structuredClone(createChartSpec("line", "line"));
    (spec.data.rows[1]!.values as Record<string, unknown>)["value-1"] = null;
    const option = compileChartOption(spec, "Arial");
    expect(option.animation).toBe(false);
    expect(option.series).toMatchObject([{ data: [12, null, 15, 24], connectNulls: false, showSymbol: false }, {}]);
    expect(option.legend).toMatchObject({ selectedMode: false });
  });
  it("uses stable pie row colors and omits absent values", () => {
    const spec = structuredClone(createChartSpec("pie", "pie"));
    (spec.data.rows[1]!.values as Record<string, unknown>)["value-1"] = null;
    expect(compileChartOption(spec, "Arial").series).toMatchObject([{ data: [
      { name: "第一季度", value: 12, itemStyle: { color: spec.style.palette[0] } },
      { name: "第三季度", value: 15, itemStyle: { color: spec.style.palette[2] } },
      { name: "第四季度", value: 24, itemStyle: { color: spec.style.palette[3] } }
    ] }]);
  });
  it.each(["column", "bar", "line", "area", "pie", "doughnut"] as const)("renders %s title and raw labels through the actual ECharts SVG renderer", type => {
    echarts.use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TitleComponent, SVGRenderer]);
    const spec = assertChartSpec({ ...createChartSpec(type, type), presentation: {
      ...createChartSpec(type, type).presentation, title: "Quarterly result", legend: "none", dataLabels: true
    } });
    const renderer = echarts.init(null, undefined, { renderer: "svg", ssr: true, ...spec.extent });
    try {
      renderer.setOption(compileChartOption(spec, "Arial"));
      const svg = renderer.renderToSVGString();
      expect(svg).toContain("Quarterly result"); expect(svg).toContain(">12</text>");
      expect(svg).toContain(spec.style.palette[0]);
    } finally { renderer.dispose(); }
  });
  it("swaps bar axes, derives proportional values, preserves gaps and shows raw labels", () => {
    const source = JSON.parse(JSON.stringify(createChartSpec("bar", "normalized")));
    source.data.rows[0].values["value-1"] = 3; source.data.rows[0].values["value-2"] = 1;
    source.data.rows[1].values["value-1"] = null; source.data.rows[1].values["value-2"] = 0;
    source.presentation.dataLabels = true; source.presentation.gridlines = false;
    const spec = changeChartGrouping(assertChartSpec(source), "percentStacked");
    const option = compileChartOption(spec, "Arial");
    expect(option.xAxis).toMatchObject({ type: "value", min: 0, max: 100, splitLine: { show: false } });
    expect(option.yAxis).toMatchObject({ type: "category" });
    const series = option.series as Array<{ data: Array<number | null>; label: { formatter: (point: { dataIndex: number }) => string } }>;
    expect(series[0]!.data.slice(0, 2)).toEqual([75, null]); expect(series[1]!.data.slice(0, 2)).toEqual([25, 0]);
    expect(series[0]!.label.formatter({ dataIndex: 0 })).toBe("3"); expect(spec.data.rows[0]!.values["value-1"]).toBe(3);
    const area = assertChartSpec({ ...spec, type: "area", blankPolicy: "zero" });
    expect(compileChartOption(area, "Arial").series).toMatchObject([{ data: [75, 0, expect.any(Number), expect.any(Number)], areaStyle: { opacity: 1 } }, {}]);
  });
  it("keeps a positive compact plot and bounds the fixed ring inside its available local frame", () => {
    const spec = createChartSpec("doughnut", "compact");
    const compact = { ...spec, extent: { width: 120, height: 120 }, presentation: { ...spec.presentation, title: "Compact", legend: "top" as const } };
    const insets = chartPlotInsets(compact), option = compileChartOption(compact, "Arial");
    expect(insets.left + insets.right).toBeLessThanOrEqual(72); expect(insets.top + insets.bottom).toBeLessThanOrEqual(72);
    const radius = (option.series as Array<{ radius: number[] }>)[0]!.radius;
    expect(radius[1]).toBeGreaterThan(0); expect(radius[1]).toBeLessThanOrEqual(24); expect(radius[0]! / radius[1]!).toBeCloseTo(0.6);
  });
});
