import { isCircularChart } from "../model/preset";
import type { ChartType } from "../model/types";
import { ChartValidationError } from "../model/validation";
import type { ChartDataDraft, ChartDataIdAllocator } from "./types";
import { acceptChartDataDraft, readChartDataDraft } from "./value";
import { assertChartDataText } from "./cells";

/**
 * Parses bounded CSV/TSV with quoted fields; never splits inside a quoted newline.
 * @param input - Clipboard or UTF-8 file text.
 * @returns A complete rectangular text matrix; malformed or oversized input throws.
 */
export function parseChartDelimitedText(input: string): string[][] {
  if (input.length > 2 * 1024 * 1024) throw new ChartValidationError("data", "chart-json-limit");
  const text = input.replace(/^\ufeff/u, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  /** Completes one bounded field without interpreting its value. */
  function field(): void { assertChartDataText(cell); row.push(cell); cell = ""; closed = false; }
  /** Completes one bounded row before accepting any importer mutation. */
  function line(): void {
    field();
    if (row.length > 32 || rows.length >= 1001) throw new ChartValidationError("data", "chart-list-limit");
    rows.push(row); row = [];
  }
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (quoted) {
      if (char !== '"') cell += char;
      else if (text[index + 1] === '"') { cell += '"'; index++; }
      else { quoted = false; closed = true; }
    } else if (char === delimiter) field();
    else if (char === "\r" || char === "\n") { line(); if (char === "\r" && text[index + 1] === "\n") index++; }
    else if (char === '"' && cell === "" && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new ChartValidationError("data", "chart-delimited-invalid");
      cell += char;
    }
  }
  if (quoted) throw new ChartValidationError("data", "chart-delimited-invalid");
  if (cell !== "" || row.length > 0 || closed || rows.length === 0) line();
  const width = rows[0]!.length;
  if (rows.some(row => row.length !== width)) throw new ChartValidationError("data", "chart-delimited-ragged");
  return rows;
}

/**
 * Imports a titled category/numeric table without changing chart identity or styles.
 * @param text - Complete CSV/TSV text.
 * @param type - Plot family; pie binds its first numeric column and retains the others.
 * @param allocate - Fresh row/column/series identities supplied by the host.
 * @returns Fully parsed detached data; any invalid numeric cell rejects the whole file.
 */
export function importChartDelimitedData(text: string, type: ChartType, allocate: ChartDataIdAllocator): ChartDataDraft {
  const [head, ...matrix] = parseChartDelimitedText(text);
  if (head === undefined || head.length < 2 || head.some(name => !name.trim()) || matrix.length === 0)
    throw new ChartValidationError("data", "chart-delimited-header-required");
  const columns = head.map((name, index) => ({ id: allocate("column"), name: name.trim(), type: index === 0 ? "string" as const : "number" as const }));
  const numeric = isCircularChart(type) ? columns.slice(1, 2) : columns.slice(1);
  const data = acceptChartDataDraft({ columns,
    rows: matrix.map(values => ({ id: allocate("row"), values: Object.fromEntries(columns.map((column, index) => [column.id, values[index]!])) })),
    series: numeric.map(column => ({ id: allocate("series"), name: column.name, categoryColumn: columns[0]!.id, valueColumn: column.id })) });
  readChartDataDraft(data);
  return data;
}

/** @param text - Complete input. @returns Delimiter observed outside quotes on the first logical row. */
function detectDelimiter(text: string): "\t" | "," {
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (char === "\t") return "\t";
      if (char === "\r" || char === "\n") break;
    }
  }
  return ",";
}
