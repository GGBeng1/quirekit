import { ChartValidationError } from "../model/validation";
import type { ChartDataDraft, ChartDataIdAllocator } from "./types";
import { acceptChartDataDraft } from "./value";

/**
 * Transposes a fully bound categorical matrix without discarding unplotted data.
 * @param data - Complete one-category/one-series-per-number-column matrix.
 * @param allocate - Fresh identities for the changed data topology.
 * @returns Exact transposed values with new bindings; ambiguous or oversized cases throw.
 */
export function transposeChartData(data: ChartDataDraft, allocate: ChartDataIdAllocator): ChartDataDraft {
  const category = data.series[0]!.categoryColumn;
  const values = data.series.map(series => series.valueColumn);
  if (data.rows.length > 16 || data.columns.length !== data.series.length + 1 || new Set(values).size !== values.length
    || data.columns.some(column => column.id !== category && !values.includes(column.id))
    || data.rows.some(row => !row.values[category]?.trim()))
    throw new ChartValidationError("data", "chart-transpose-ineligible");
  const categoryId = allocate("column");
  const numeric = data.rows.map(row => ({ id: allocate("column"), name: row.values[category]!, type: "number" as const }));
  return acceptChartDataDraft({ columns: [{ id: categoryId, name: data.columns.find(column => column.id === category)!.name, type: "string" }, ...numeric],
    rows: data.series.map(series => ({ id: allocate("row"), values: Object.fromEntries([[categoryId, series.name],
      ...numeric.map((column, index) => [column.id, data.rows[index]!.values[series.valueColumn]!])]) })),
    series: numeric.map(column => ({ id: allocate("series"), name: column.name, categoryColumn: categoryId, valueColumn: column.id })) });
}
