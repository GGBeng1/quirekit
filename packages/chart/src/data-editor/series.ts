import type { ChartSeries } from "../model/types";
import { ChartValidationError } from "../model/validation";
import type { ChartDataDraft } from "./types";
import { copyChartDataDraft, acceptChartDataDraft } from "./value";

/** @param data - Detached source. @param series - Fresh identified series with explicit bindings. @returns Draft with that plotted series. */
export function appendChartDataSeries(data: ChartDataDraft, series: ChartSeries): ChartDataDraft {
  const next = copyChartDataDraft(data);
  next.series.push({ ...series });
  return acceptChartDataDraft(next);
}

/** @param data - Detached source. @param id - Exact series identity. @returns Draft retaining every data column after plot removal. */
export function removeChartDataSeries(data: ChartDataDraft, id: string): ChartDataDraft {
  if (!data.series.some(series => series.id === id)) throw new ChartValidationError("series", "chart-series-unavailable");
  return acceptChartDataDraft({ ...copyChartDataDraft(data), series: data.series.filter(series => series.id !== id).map(series => ({ ...series })) });
}

/** @param data - Detached source. @param columnId - Shared string category column. @returns Draft with all series rebound together. */
export function bindChartDataCategory(data: ChartDataDraft, columnId: string): ChartDataDraft {
  const next = copyChartDataDraft(data);
  next.series = next.series.map(series => ({ ...series, categoryColumn: columnId }));
  return acceptChartDataDraft(next);
}
