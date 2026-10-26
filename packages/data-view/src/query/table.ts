import type { DataSet, DataTableView } from "../model/types";
import type { DataPageOptions, DataTablePage } from "./types";
import { readDataSet } from "../codec/json";
import { checkView } from "../validation/query";
import { matchingRecords, page } from "./execute";

/** Queries and aggregates once before slicing the visible table window.
 * @param input - Complete local snapshot.
 * @param view - Authored query and compatible column aggregates.
 * @param options - Optional visible page.
 * @returns Page and statistics sharing one query result.
 */
export function queryDataTable(input: DataSet, view: DataTableView, options: DataPageOptions = {}): DataTablePage {
  const data = readDataSet(input);
  checkView(view, new Map(data.fields.map(field => [field.id, field])));
  const records = matchingRecords(data, view.query, options.search), summaries: Record<string, number | null> = {};
  for (const [fieldId, kind] of Object.entries(view.summaries ?? {})) {
    let count = 0, sum = 0;
    for (const row of records) {
      const value = row.values[fieldId];
      if (value === null || value === "" || Array.isArray(value) && !value.length) continue;
      count++;
      if (typeof value === "number") sum += value;
    }
    const value = kind === "count" ? count : kind === "sum" ? sum : count ? sum / count : null;
    summaries[fieldId] = value === null || !Number.isFinite(value) ? null : value;
  }
  return {...page(records, data.revision, options), summaries};
}
