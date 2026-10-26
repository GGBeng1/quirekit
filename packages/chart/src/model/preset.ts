import type { ChartGrouping, ChartPresentation, ChartSpec, ChartType } from "./types";

/**
 * Creates a small readable simple-1 dataset with stable identities.
 * @param type - Admitted plot family.
 * @param id - Host-allocated content identity.
 * @returns Complete initial chart data.
 */
export function createChartSpec(type: ChartType, id: string): ChartSpec {
  const count = isCircularChart(type) ? 1 : 2;
  return {
    version: 1, id, revision: 1, type, grouping: "standard", presentation: createChartPresentation(type),
    data: {
      columns: [{ id: "category", name: "类别", type: "string" },
        ...Array.from({ length: count }, (_, i) => ({ id: `value-${i + 1}`, name: `系列 ${i + 1}`, type: "number" as const }))],
      rows: ["第一季度", "第二季度", "第三季度", "第四季度"].map((category, i) => ({
        id: `row-${i + 1}`, values: { category,
          ...Object.fromEntries(Array.from({ length: count }, (_, series) => [`value-${series + 1}`, [12, 18, 15, 24][i]! + series * 4])) }
      }))
    },
    series: Array.from({ length: count }, (_, i) => ({ id: `series-${i + 1}`, name: `系列 ${i + 1}`, categoryColumn: "category", valueColumn: `value-${i + 1}` })),
    style: { presetId: "simple-1", palette: ["#356BBC", "#E29140", "#63965A", "#9966AA", "#4CA6AA", "#CB6770"], fontRole: "body" },
    extent: { width: 600, height: 360 }, locale: "zh-CN", blankPolicy: resolveChartBlankPolicy(type, "standard")
  };
}

/** @param type - Admitted family. @returns Whether its plot is circular and axis-free. */
export function isCircularChart(type: ChartType): boolean { return type === "pie" || type === "doughnut"; }

/** @param type - Admitted family. @returns Complete default presentation, with circular axes disabled together. */
export function createChartPresentation(type: ChartType): ChartPresentation {
  const axes = !isCircularChart(type);
  return { title: "", legend: "bottom", dataLabels: false, categoryAxis: axes, valueAxis: axes, gridlines: axes };
}

/** @param type - Admitted family. @param grouping - Complete grouping. @returns Explicit missing-value drawing treatment verified in Word. */
export function resolveChartBlankPolicy(type: ChartType, grouping: ChartGrouping): ChartSpec["blankPolicy"] {
  return type === "area" || (type === "line" && grouping !== "standard") ? "zero" : "gap";
}
