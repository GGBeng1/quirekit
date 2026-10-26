import type { ChartSpec } from "../model/types";
import { ChartValidationError } from "../model/validation";
import type { ChartDataDraft, ChartDataValue } from "./types";

/** @param source - Immutable chart. @returns Detached raw-text data and bindings. */
export function createChartDataDraft(source: ChartSpec): ChartDataDraft {
  return {
    columns: source.data.columns.map(column => ({ ...column })), series: source.series.map(series => ({ ...series })),
    rows: source.data.rows.map(row => ({ id: row.id,
      values: Object.fromEntries(Object.entries(row.values).map(([id, value]) => [id, value === null ? "" : String(value)])) }))
  };
}

/** @param draft - Complete raw-text input. @returns Typed data to validate with the owning chart. */
export function readChartDataDraft(draft: ChartDataDraft): ChartDataValue {
  assertChartDataShape(draft);
  return { data: { columns: draft.columns.map(column => ({ ...column })), rows: draft.rows.map((row, index) => ({ id: row.id,
    values: Object.fromEntries(draft.columns.map(column => [column.id, column.type === "string"
      ? row.values[column.id]! : readChartDataNumber(row.values[column.id]!, `data.rows[${index}].values.${column.id}`)])) })) },
  series: draft.series.map(series => ({ ...series })) };
}

/** @param text - Raw numeric input. @param path - Diagnostic field. @returns Finite decimal or null; never a guessed zero. */
export function readChartDataNumber(text: string, path: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(trimmed) || !Number.isFinite(Number(trimmed))) {
    throw new ChartValidationError(path, "chart-invalid-number");
  }
  return Number(trimmed);
}

/** @param draft - Raw data. Checks topology while permitting incomplete labels and numbers. */
export function assertChartDataShape(draft: ChartDataDraft): void {
  if (draft.columns.length < 2 || draft.columns.length > 32 || draft.rows.length < 1 || draft.rows.length > 1000
    || draft.series.length < 1 || draft.series.length > 16 || draft.rows.length * draft.series.length > 16000) {
    throw new ChartValidationError("data", "chart-list-limit");
  }
  for (const [name, items] of [["columns", draft.columns], ["rows", draft.rows], ["series", draft.series]] as const) {
    const ids = new Set<string>();
    for (const item of items) {
      if (!item.id.trim() || item.id.length > 128 || /[\u0000-\u001f]/u.test(item.id) || ids.has(item.id))
        throw new ChartValidationError(`data.${name}`, "chart-duplicate-id");
      ids.add(item.id);
    }
  }
  const columns = new Map(draft.columns.map(column => [column.id, column.type]));
  const category = draft.series[0]!.categoryColumn;
  for (const series of draft.series) {
    if (series.categoryColumn !== category || columns.get(series.categoryColumn) !== "string"
      || columns.get(series.valueColumn) !== "number") throw new ChartValidationError("series", "chart-invalid-binding");
  }
  for (const row of draft.rows) {
    if (Object.keys(row.values).length !== columns.size
      || draft.columns.some(column => !Object.hasOwn(row.values, column.id) || typeof row.values[column.id] !== "string"))
      throw new ChartValidationError("data.rows", "chart-invalid-binding");
  }
}

/** @param draft - Proposed complete topology. @returns Admitted detached state, without touching its predecessor. */
export function acceptChartDataDraft(draft: ChartDataDraft): ChartDataDraft { assertChartDataShape(draft); return draft; }

/**
 * Copies only chart-owned values, accepting plain objects and reactive host proxies.
 * @param source - Raw-text source whose identities remain stable.
 * @returns Detached mutable topology; no nested row or binding aliases survive.
 */
export function copyChartDataDraft(source: ChartDataDraft): ChartDataDraft {
  return {
    columns: source.columns.map(column => ({ ...column })),
    rows: source.rows.map(row => ({ id: row.id, values: { ...row.values } })),
    series: source.series.map(series => ({ ...series }))
  };
}
