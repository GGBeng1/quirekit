import { ChartValidationError } from "../model/validation";
import type { ChartDataDraft } from "./types";
import { copyChartDataDraft, acceptChartDataDraft } from "./value";

/** @param data - Detached source. @param id - Fresh row identity. @returns Draft with one complete empty row. */
export function appendChartDataRow(data: ChartDataDraft, id: string): ChartDataDraft {
  const next = copyChartDataDraft(data);
  next.rows.push({ id, values: Object.fromEntries(next.columns.map(column => [column.id, ""])) });
  return acceptChartDataDraft(next);
}

/** @param data - Detached source. @param id - Exact row identity. @returns Draft without that row; final/missing deletion fails. */
export function removeChartDataRow(data: ChartDataDraft, id: string): ChartDataDraft {
  if (!data.rows.some(row => row.id === id)) throw new ChartValidationError("data.rows", "chart-row-unavailable");
  return acceptChartDataDraft({ ...copyChartDataDraft(data), rows: data.rows.filter(row => row.id !== id).map(row => ({ id: row.id, values: { ...row.values } })) });
}

/** @param data - Detached source. @param id - Fresh column identity. @param name - Editable heading. @returns Draft with an unbound numeric column. */
export function appendChartDataColumn(data: ChartDataDraft, id: string, name: string): ChartDataDraft {
  const next = copyChartDataDraft(data);
  next.columns.push({ id, name, type: "number" });
  next.rows = next.rows.map(row => ({ ...row, values: { ...row.values, [id]: "" } }));
  return acceptChartDataDraft(next);
}

/** @param data - Detached source. @param id - Exact column identity. @returns Draft with its series references removed atomically. */
export function removeChartDataColumn(data: ChartDataDraft, id: string): ChartDataDraft {
  if (!data.columns.some(column => column.id === id)) throw new ChartValidationError("data.columns", "chart-column-unavailable");
  if (data.series.some(series => series.categoryColumn === id)) throw new ChartValidationError("data.columns", "chart-category-required");
  const next = copyChartDataDraft(data);
  next.columns = next.columns.filter(column => column.id !== id);
  next.series = next.series.filter(series => series.valueColumn !== id);
  next.rows = next.rows.map(row => ({ ...row, values: Object.fromEntries(Object.entries(row.values).filter(([key]) => key !== id)) }));
  return acceptChartDataDraft(next);
}
