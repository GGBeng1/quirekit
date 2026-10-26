import type { DataField, DataFilter, DataRecord } from "../model/types";
import { compareDataValue } from "./compare";

/** Applies a validated predicate without coercion or partial-page assumptions.
 * @param record - Complete source record.
 * @param filter - Validated expression.
 * @param fields - Field lookup compiled once for this query.
 * @returns Whether the record matches.
 */
export function matchesDataFilter(record: DataRecord, filter: DataFilter, fields: ReadonlyMap<string, DataField>): boolean {
  if ("all" in filter) return filter.all.every(child => matchesDataFilter(record, child, fields));
  if ("any" in filter) return filter.any.some(child => matchesDataFilter(record, child, fields));
  const value = record.values[filter.fieldId]!, field = fields.get(filter.fieldId)!;
  const empty = value === null || value === "" || Array.isArray(value) && value.length === 0;
  if (filter.op === "isEmpty") return empty;
  if (filter.op === "isNotEmpty") return !empty;
  if (value === null || !("value" in filter)) return false;
  if (filter.op === "contains") return typeof value === "string" ? value.includes(filter.value as string) : (value as readonly string[]).includes(filter.value as string);
  const comparison = compareDataValue(field, value, filter.value);
  switch (filter.op) {
    case "eq": return comparison === 0;
    case "neq": return comparison !== 0;
    case "lt": return comparison < 0;
    case "lte": return comparison <= 0;
    case "gt": return comparison > 0;
    case "gte": return comparison >= 0;
  }
}
