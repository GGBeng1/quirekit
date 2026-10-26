import { isCircularChart, type ChartSpec } from "@quirekit/chart";
import type { EChartsCoreOption } from "echarts/core";
import { compileChartPresentation, chartPlotInsets } from "./presentation";
import { projectChartValues } from "./data";

/**
 * Compiles the admitted family tuple without accepting arbitrary ECharts options.
 * @param spec - Validated immutable model and explicit presentation.
 * @param fontFamily - Host-resolved document typography.
 * @returns Static snapshot option; raw data remains independent of normalized drawing values.
 */
export function compileChartOption(spec: ChartSpec, fontFamily: string): EChartsCoreOption {
  const categories = spec.data.rows.map(row => row.values[spec.series[0]!.categoryColumn]);
  const common = compileChartPresentation(spec, fontFamily), labels = spec.presentation.dataLabels;
  if (isCircularChart(spec.type)) {
    const series = spec.series[0]!, insets = chartPlotInsets(spec);
    const regular = !spec.presentation.title && spec.presentation.legend === "bottom";
    const center = regular ? ["50%", "45%"] : [(insets.left + spec.extent.width - insets.right) / 2,
      (insets.top + spec.extent.height - insets.bottom) / 2];
    const radius = Math.min(Math.min(spec.extent.width, spec.extent.height) * 0.32,
      (spec.extent.width - insets.left - insets.right) / 2, (spec.extent.height - insets.top - insets.bottom) / 2);
    return { ...common, series: [{ type: "pie", name: series.name,
      radius: spec.type === "doughnut" ? [radius * 0.6, radius] : radius, center, silent: true,
      label: { show: labels, position: "inside", formatter: "{c}" }, emphasis: { disabled: true },
      data: spec.data.rows.flatMap((row, index) => row.values[series.valueColumn] === null ? [] : [{
        name: String(categories[index] ?? ""), value: row.values[series.valueColumn] as number,
        itemStyle: { color: spec.style.palette[index % spec.style.palette.length] }
      }]) }] };
  }
  const horizontal = spec.type === "bar", bar = horizontal || spec.type === "column";
  const values = projectChartValues(spec), percent = spec.grouping === "percentStacked";
  const category = { type: "category", data: categories, axisTick: { show: false },
    boundaryGap: bar, axisLine: { show: spec.presentation.categoryAxis, lineStyle: { color: "#bfc4ca" } },
    axisLabel: { show: spec.presentation.categoryAxis, interval: 0, overflow: "truncate", width: 110 } };
  const value = { type: "value", splitLine: { show: spec.presentation.gridlines, lineStyle: { color: "#e8ebee" } },
    axisLine: { show: spec.presentation.valueAxis, lineStyle: { color: "#bfc4ca" } }, axisTick: { show: false },
    axisLabel: { show: spec.presentation.valueAxis, color: "#555555", ...(percent ? { formatter: "{value}%" } : {}) },
    ...(percent ? { min: 0, max: 100 } : {}) };
  return { ...common, grid: { ...chartPlotInsets(spec), containLabel: true },
    xAxis: horizontal ? value : category, yAxis: horizontal ? category : value,
    series: spec.series.map((series, index) => ({
      name: series.name, type: bar ? "bar" : "line", silent: true, data: values[index],
      ...(spec.grouping !== "standard" ? { stack: "chart-values" } : {}),
      ...(spec.type === "area" ? { areaStyle: { opacity: 1 } } : {}),
      label: { show: labels, position: bar ? spec.grouping === "standard" ? horizontal ? "right" : "top" : "inside" : "top",
        formatter: (point: { dataIndex: number }) => {
          const raw = spec.data.rows[point.dataIndex]?.values[series.valueColumn];
          return raw === null ? spec.blankPolicy === "zero" ? "0" : "" : String(raw ?? "");
        } },
      connectNulls: false, showSymbol: labels, symbol: labels ? "circle" : "none", symbolSize: 0, barMaxWidth: 48,
      emphasis: { disabled: true }
    })) };
}
