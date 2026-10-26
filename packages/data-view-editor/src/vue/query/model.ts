import type { DataField, DataFilter, DataQuery } from "@quirekit/data-view";
import { formatDataValue } from "@quirekit/data-view";

/** Known operator labels; available operators are narrowed by the field. */
export const filterLabels = {eq: "等于", neq: "不等于", contains: "包含", lt: "小于", lte: "不大于", gt: "大于", gte: "不小于", isEmpty: "为空", isNotEmpty: "不为空"};
/** @param field - Typed field. @returns Only semantically valid filter operators. */
export function filterOperators(field: DataField) {
  const ops: (keyof typeof filterLabels)[] = field.type === "multiSelect" ? ["contains"] : field.type === "text" ? ["contains", "eq", "neq"] : ["eq", "neq"];
  if (["number", "date", "datetime"].includes(field.type)) ops.push("gt", "gte", "lt", "lte");
  return [...ops, "isEmpty" as const, "isNotEmpty" as const].map(value => ({value, label: filterLabels[value]}));
}
/** Preserves each imported compound rule as a unit in an AND list.
 * @param filter - Existing complete expression.
 * @returns Top-level conjunction entries without flattening OR semantics.
 */
export function filterEntries(filter?: DataFilter): readonly DataFilter[] { return !filter ? [] : "all" in filter ? filter.all : [filter]; }
/** @param query - Current sort and filter. @param entries - Remaining conjunction. @returns Query without an empty logical group. */
export function withFilterEntries(query: DataQuery, entries: readonly DataFilter[]): DataQuery {
  const {filter: _filter, ...rest} = query;
  return {...rest, ...(entries.length ? {filter: entries.length === 1 ? entries[0]! : {all: entries}} : {})};
}
/** @param filter - Rule or preserved compound group. @param fields - Schema. @returns Human-readable condition without changing its logic. */
export function filterDescription(filter: DataFilter, fields: readonly DataField[]): string {
  if ("all" in filter) return `(${filter.all.map(child => filterDescription(child, fields)).join(" 且 ")})`;
  if ("any" in filter) return `(${filter.any.map(child => filterDescription(child, fields)).join(" 或 ")})`;
  const field = fields.find(field => field.id === filter.fieldId);
  const value = "value" in filter ? field ? formatDataValue(field, field.type === "multiSelect" ? [String(filter.value)] : filter.value) : String(filter.value) : "";
  return `${field?.name ?? filter.fieldId} ${filterLabels[filter.op]}${value ? ` ${value}` : ""}`;
}
