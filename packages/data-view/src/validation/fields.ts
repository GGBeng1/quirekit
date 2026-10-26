import type { DataField, DataSet, DataValue } from "../model/types";
import { DataViewError, requireData } from "./error";
import { array, choice, extensions, identity, object, text } from "./primitives";

/** Checks a real calendar date without timezone conversion.
 * @param value - Encoded date.
 * @returns Whether this is a valid YYYY-MM-DD date.
 */
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Validates a declared field.
 * @param value - Field source.
 * @param path - Diagnostic path.
 * @returns Checked field.
 */
export function checkField(value: unknown, path: string): DataField {
  const field = object(value, path, ["id", "name", "type", "options"], ["id", "name", "type"]);
  identity(field.id, `${path}.id`); text(field.name, `${path}.name`);
  const type = choice(field.type, ["text", "number", "boolean", "date", "datetime", "singleSelect", "multiSelect"], `${path}.type`);
  if (type === "singleSelect" || type === "multiSelect") {
    const ids = new Set<string>();
    array(field.options, `${path}.options`, 256).forEach((item, i) => {
      const optionPath = `${path}.options[${i}]`, option = object(item, optionPath, ["id", "label", "color"], ["id", "label"]);
      const id = identity(option.id, `${optionPath}.id`); text(option.label, `${optionPath}.label`);
      if (option.color !== undefined) choice(option.color, ["neutral", "primary", "info", "success", "warning", "danger"], `${optionPath}.color`);
      requireData(!ids.has(id), optionPath, "Duplicate option"); ids.add(id);
    });
  } else requireData(!Object.hasOwn(field, "options"), path, "Scalar field cannot declare options");
  return value as DataField;
}

/** Validates a cell using its field's actual value space.
 * @param field - Owning field.
 * @param value - Proposed cell.
 * @param path - Diagnostic path.
 * @param primary - Whether this is the required text title.
 */
export function checkCell(field: DataField, value: unknown, path: string, primary = false): asserts value is DataValue {
  if (value === null && !primary) return;
  switch (field.type) {
    case "text": requireData(typeof value === "string", path, "Expected text"); break;
    case "number": requireData(typeof value === "number" && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value)), path, "Expected a finite, safely represented number"); break;
    case "boolean": requireData(typeof value === "boolean", path, "Expected boolean"); break;
    case "date": requireData(typeof value === "string" && validDate(value), path, "Expected a real YYYY-MM-DD date"); break;
    case "datetime": {
      requireData(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) && validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value)), path, "Expected a timestamp with timezone"); break;
    }
    case "singleSelect": requireData(typeof value === "string" && field.options.some(option => option.id === value), path, "Unknown option"); break;
    case "multiSelect": {
      const items = array(value, path, 256), ids = new Set(field.options.map(option => option.id));
      requireData(items.every(item => typeof item === "string" && ids.has(item)) && new Set(items).size === items.length, path, "Expected unique known options"); break;
    }
  }
}

/** Checks a complete dataset's structure and all references.
 * @param value - Detached JSON data.
 * @param path - Diagnostic root.
 * @returns Checked dataset.
 */
export function checkDataset(value: unknown, path = "$"): DataSet {
  const data = object(value, path, ["format", "version", "id", "revision", "primaryFieldId", "fields", "records", "extensions"], ["format", "version", "id", "revision", "primaryFieldId", "fields", "records"]);
  requireData(data.format === "quirekit-dataset", `${path}.format`, "Expected quirekit-dataset");
  if (data.version !== 1) throw new DataViewError("unsupported", `${path}.version`, "Unsupported dataset version");
  identity(data.id, `${path}.id`); requireData(text(data.revision, `${path}.revision`).length > 0, path, "Missing revision");
  const primary = identity(data.primaryFieldId, `${path}.primaryFieldId`);
  const fields = array(data.fields, `${path}.fields`, 128, 1).map((field, i) => checkField(field, `${path}.fields[${i}]`));
  const byId = new Map(fields.map(field => [field.id, field]));
  requireData(byId.size === fields.length, `${path}.fields`, "Duplicate field identity");
  requireData(byId.get(primary)?.type === "text", `${path}.primaryFieldId`, "Primary field must be text");
  const rowIds = new Set<string>();
  array(data.records, `${path}.records`).forEach((item, i) => {
    const rowPath = `${path}.records[${i}]`, row = object(item, rowPath, ["id", "values"]);
    const id = identity(row.id, `${rowPath}.id`);
    requireData(!rowIds.has(id), rowPath, "Duplicate record identity"); rowIds.add(id);
    const values = object(row.values, `${rowPath}.values`, [...byId.keys()]);
    for (const field of fields) checkCell(field, values[field.id], `${rowPath}.values.${field.id}`, field.id === primary);
  });
  extensions(data.extensions, `${path}.extensions`);
  return value as DataSet;
}
