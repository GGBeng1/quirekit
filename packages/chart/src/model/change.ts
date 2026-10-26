import type { ChartGrouping, ChartSpec, ChartType } from "./types";
import { assertChartSpec } from "./validation";
import { createChartPresentation, isCircularChart, resolveChartBlankPolicy } from "./preset";

/**
 * Replaces one complete family tuple without changing its data or silently removing series.
 * @param source - Current typed draft; validation applies to the complete replacement tuple.
 * @param type - User-selected family.
 * @returns Admitted detached family, or an explicit incompatible-series error.
 */
export function changeChartFamily(source: ChartSpec, type: ChartType): ChartSpec {
  const grouping = isCircularChart(type) ? "standard" : source.grouping;
  const axes = createChartPresentation(type);
  return assertChartSpec({ ...source, type, grouping, blankPolicy: resolveChartBlankPolicy(type, grouping),
    presentation: { ...source.presentation, categoryAxis: axes.categoryAxis, valueAxis: axes.valueAxis, gridlines: axes.gridlines } });
}

/** @param source - Typed draft, possibly incompatible with its old grouping. @param grouping - User-selected grouping. @returns Complete admitted tuple, retaining raw data and series IDs. */
export function changeChartGrouping(source: ChartSpec, grouping: ChartGrouping): ChartSpec {
  return assertChartSpec({ ...source, grouping, blankPolicy: resolveChartBlankPolicy(source.type, grouping) });
}
