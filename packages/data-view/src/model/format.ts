import type { DataField, DataValue } from "./types";

/** Formats portable values without executing metadata.
 * @param field - Value schema.
 * @param value - Canonical value.
 * @returns Human-readable cell text.
 */
export function formatDataValue(field: DataField, value: DataValue): string {
  if (value === null) return "—";
  if (field.type === "singleSelect") return field.options.find(option => option.id === value)?.label ?? "—";
  if (field.type === "multiSelect" && Array.isArray(value)) return value.map(id => field.options.find(option => option.id === id)?.label ?? id).join("、");
  if (typeof value === "boolean") return value ? "是" : "否";
  return String(value);
}
