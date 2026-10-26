import type { ChartSpec } from "@quirekit/chart";

/**
 * Projects data for stacking while retaining original rows, blanks and workbook values.
 * @param spec - Admitted immutable data, with finite nonnegative sums for stacking.
 * @returns Ordered per-series values; normalization never mutates canonical data.
 */
export function projectChartValues(spec: ChartSpec): (number | null)[][] {
  const totals = spec.grouping === "percentStacked" ? spec.data.rows.map(row =>
    spec.series.reduce((sum, series) => sum + Number(row.values[series.valueColumn] ?? 0), 0)) : undefined;
  return spec.series.map(series => spec.data.rows.map((row, index) => {
    const raw = row.values[series.valueColumn] as number | null;
    if (raw === null && spec.blankPolicy === "gap") return null;
    const value = raw ?? 0;
    return totals ? totals[index] === 0 ? 0 : value / totals[index]! * 100 : value;
  }));
}
