import { createChartPresentation, isCircularChart, resolveChartBlankPolicy } from "./preset";
import type { ChartGrouping, ChartSpec, ChartType } from "./types";

/** Validation failure retaining a stable field path for UI and commands. */
export class ChartValidationError extends TypeError {
  /** Exact field that rejected input. */
  readonly path: string;
  /** Stable diagnostic identifier. */
  readonly code: string;
  /** @param path - Invalid field. @param code - Failure kind. */
  constructor(path: string, code = "chart-invalid-data") {
    super(`${code}: ${path}`);
    this.code = code;
    this.path = path;
  }
}

/**
 * Validates the complete current structure before detaching caller-owned JSON.
 * @param value - Untrusted portable chart input.
 * @returns Detached complete authority; unknown fields are never discarded.
 */
export function assertChartSpec(value: unknown): ChartSpec {
  const version = value !== null && typeof value === "object" ? (value as Record<string, unknown>).version : undefined;
  if (version !== 1) fail("version", "chart-version-unsupported");
  const spec = object(value, "chart", ["version", "id", "revision", "type", "grouping", "presentation",
    "data", "series", "style", "extent", "locale", "blankPolicy"]);
  identity(spec.id, "id");
  if (!Number.isSafeInteger(spec.revision) || Number(spec.revision) < 1) fail("revision");
  if (!["column", "bar", "line", "area", "pie", "doughnut"].includes(String(spec.type))) fail("type");
  const type = spec.type as ChartType;
  validatePresentation(spec, type);
  const data = object(spec.data, "data", ["columns", "rows"]);
  const columns = array(data.columns, "data.columns", 32);
  const rows = array(data.rows, "data.rows", 1000);
  const columnTypes = new Map<string, unknown>();
  for (const [i, raw] of columns.entries()) {
    const path = `data.columns[${i}]`, column = object(raw, path, ["id", "name", "type"]);
    identity(column.id, `${path}.id`); label(column.name, `${path}.name`);
    if (columnTypes.has(String(column.id))) fail(`${path}.id`, "chart-duplicate-id");
    if (column.type !== "string" && column.type !== "number") fail(`${path}.type`);
    columnTypes.set(String(column.id), column.type);
  }
  const rowIds = new Set<string>();
  for (const [i, raw] of rows.entries()) {
    const path = `data.rows[${i}]`, row = object(raw, path, ["id", "values"]);
    identity(row.id, `${path}.id`);
    if (rowIds.has(String(row.id))) fail(`${path}.id`, "chart-duplicate-id");
    rowIds.add(String(row.id));
    const values = object(row.values, `${path}.values`, [...columnTypes.keys()]);
    for (const [id, type] of columnTypes) {
      const cell = values[id];
      if (type === "string" ? typeof cell !== "string" || cell.length > 4096 || !isXmlText(cell)
        : cell !== null && (typeof cell !== "number" || !Number.isFinite(cell))) fail(`${path}.values.${id}`);
    }
  }
  // Series bindings are validated independently from display order, then the
  // complete family tuple rules out ambiguous category and pie projections.
  const series = array(spec.series, "series", 16), seriesIds = new Set<string>();
  let category: string | undefined;
  for (const [i, raw] of series.entries()) {
    const path = `series[${i}]`, entry = object(raw, path, ["id", "name", "categoryColumn", "valueColumn"]);
    identity(entry.id, `${path}.id`); label(entry.name, `${path}.name`);
    if (seriesIds.has(String(entry.id))) fail(`${path}.id`, "chart-duplicate-id");
    seriesIds.add(String(entry.id));
    if (columnTypes.get(String(entry.categoryColumn)) !== "string"
      || columnTypes.get(String(entry.valueColumn)) !== "number") fail(path, "chart-invalid-binding");
    if (category !== undefined && entry.categoryColumn !== category) fail(path, "chart-multiple-category-columns");
    category = String(entry.categoryColumn);
    if (isCircularChart(type)) {
      if (series.length !== 1) fail("series", "chart-pie-single-series-required");
      const values = rows.map(row => (row as { values: Record<string, number | null> }).values[String(entry.valueColumn)]);
      if (values.some(n => n !== null && Number(n) < 0) || !values.some(n => Number(n) > 0)) fail(path, "chart-pie-nonnegative-positive-required");
    }
  }
  if (series.length * rows.length > 16000) fail("data", "chart-point-limit");
  const style = object(spec.style, "style", ["presetId", "palette", "fontRole"]);
  if (style.presetId !== "simple-1" || style.fontRole !== "body") fail("style", "chart-native-profile-ineligible");
  for (const color of array(style.palette, "style.palette", 32)) {
    if (typeof color !== "string" || !/^#[\da-f]{6}$/iu.test(color)) fail("style.palette");
  }
  const extent = object(spec.extent, "extent", ["width", "height"]);
  for (const dimension of ["width", "height"]) {
    if (typeof extent[dimension] !== "number" || !Number.isFinite(extent[dimension])
      || Number(extent[dimension]) < 120 || Number(extent[dimension]) > 2000) fail(`extent.${dimension}`);
  }
  if (typeof spec.locale !== "string" || !/^[a-z]{2,3}(?:-[a-z\d]{2,8})*$/iu.test(spec.locale)) fail("locale");
  if (spec.blankPolicy !== resolveChartBlankPolicy(type, spec.grouping as ChartGrouping))
    fail("blankPolicy", "chart-native-profile-ineligible");
  if (spec.grouping !== "standard") {
    // Check bounded raw sums before either renderer normalizes or stacks them.
    // Missing values remain authority; drawing-only zeros are derived later.
    for (const row of rows) {
      let sum = 0;
      for (const item of series) {
        const entry = item as { valueColumn: string }, values = (row as { values: Record<string, number | null> }).values;
        const cell = values[entry.valueColumn];
        if (cell !== null && Number(cell) < 0) fail("data", "chart-stacked-nonnegative-required");
        sum += cell ?? 0;
      }
      if (!Number.isFinite(sum)) fail("data", "chart-stack-overflow");
    }
  }
  const json = JSON.stringify(value);
  if (json.length > 2 * 1024 * 1024) fail("chart", "chart-json-limit");
  return JSON.parse(json) as ChartSpec;
}

/** @param value - Candidate record. @param path - Field. @param fields - Exact keys. @returns Checked record. */
function object(value: unknown, path: string, fields: readonly string[]): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(path);
  const record = value as Record<string, unknown>, keys = Object.keys(record);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) fail(path, "chart-unrecognized-fields");
  return record;
}
/** @param value - Candidate list. @param path - Field. @param limit - Upper bound. @returns Checked bounded list. */
function array(value: unknown, path: string, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > limit) fail(path, "chart-list-limit");
  return value as unknown[];
}
/** @param value - Candidate id. @param path - Field. */
function identity(value: unknown, path: string): void {
  if (typeof value !== "string" || !value.trim() || value.length > 128 || /[\u0000-\u001f]/u.test(value)) fail(path);
}
/** @param value - Candidate label. @param path - Field. */
function label(value: unknown, path: string): void {
  if (typeof value !== "string" || !value.trim() || value.length > 4096 || !isXmlText(value)) fail(path);
}
/** @param value - Portable text. @returns Whether every code point can be represented in XML 1.0. */
function isXmlText(value: string): boolean {
  return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(value);
}
/** @param path - Invalid field. @param code - Failure. @returns Never returns. */
function fail(path: string, code?: string): never { throw new ChartValidationError(path, code); }

/** @param spec - Untrusted root fields. @param type - Checked family. Validates the complete visual/grouping tuple. */
function validatePresentation(spec: Record<string, unknown>, type: ChartType): void {
  if (!["standard", "stacked", "percentStacked"].includes(String(spec.grouping))) fail("grouping");
  const defaults = createChartPresentation(type);
  const presentation = object(spec.presentation, "presentation", Object.keys(defaults));
  if (typeof presentation.title !== "string" || presentation.title.length > 4096 || !isXmlText(presentation.title)) fail("presentation.title");
  if (!["none", "top", "bottom", "left", "right"].includes(String(presentation.legend))) fail("presentation.legend");
  for (const field of ["dataLabels", "categoryAxis", "valueAxis", "gridlines"]) {
    if (typeof presentation[field] !== "boolean") fail(`presentation.${field}`);
  }
  if (isCircularChart(type) && (spec.grouping !== "standard" || presentation.categoryAxis || presentation.valueAxis || presentation.gridlines))
    fail("presentation", "chart-circular-preset-ineligible");
}
