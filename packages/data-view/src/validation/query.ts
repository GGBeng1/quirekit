import type { DataField, DataFilter, DataQuery, DataView } from "../model/types";
import { checkCell } from "./fields";
import { DataViewError, requireData } from "./error";
import { array, choice, identities, identity, object, text } from "./primitives";

/** Checks a filter tree with bounded depth and complete-data semantics.
 * @param value - Candidate expression.
 * @param path - Diagnostic path.
 * @param fields - Known fields, absent until an external source is described.
 * @param depth - Current expression depth.
 * @param budget - Shared leaf counter.
 */
function checkFilter(value: unknown, path: string, fields: ReadonlyMap<string, DataField> | undefined, depth: number, budget: { count: number }): void {
  if (depth > 8 || ++budget.count > 128) throw new DataViewError("budget", path, "Filter exceeds depth or expression budget");
  requireData(value !== null && typeof value === "object", path, "Expected filter");
  if (Object.hasOwn(value, "all") || Object.hasOwn(value, "any")) {
    const key = Object.hasOwn(value, "all") ? "all" : "any";
    const group = object(value, path, [key]);
    array(group[key], `${path}.${key}`, 128, 1).forEach((child, i) => checkFilter(child, `${path}.${key}[${i}]`, fields, depth + 1, budget));
    return;
  }
  const rule = object(value, path, ["fieldId", "op", "value"], ["fieldId", "op"]);
  const id = identity(rule.fieldId, `${path}.fieldId`);
  const op = choice(rule.op, ["eq", "neq", "contains", "lt", "lte", "gt", "gte", "isEmpty", "isNotEmpty"], `${path}.op`);
  const field = fields?.get(id); if (fields) requireData(field, path, "Unknown filter field");
  if (op === "isEmpty" || op === "isNotEmpty") { requireData(!Object.hasOwn(rule, "value"), path, "Empty predicate cannot have a value"); return; }
  requireData(["string", "number", "boolean"].includes(typeof rule.value), `${path}.value`, "Expected a scalar comparison");
  if (!field) return;
  if (op === "contains") {
    requireData(field.type === "text" || field.type === "multiSelect", path, "Contains requires text or multiple choice");
    checkCell(field, field.type === "multiSelect" ? [rule.value] : rule.value, `${path}.value`);
  } else {
    requireData(field.type !== "multiSelect", path, "Multiple choice supports contains and empty predicates");
    if (!["eq", "neq"].includes(op)) requireData(["number", "date", "datetime"].includes(field.type), path, "Ordered comparison requires numeric or temporal field");
    checkCell(field, rule.value, `${path}.value`);
  }
}

/** Validates query structure and optional field bindings.
 * @param value - Query source.
 * @param fields - Available schema.
 * @param path - Diagnostic root.
 * @returns Checked query.
 */
export function checkQuery(value: unknown, fields?: ReadonlyMap<string, DataField>, path = "$.query"): DataQuery {
  const query = object(value, path, ["sort", "filter"], ["sort"]), seen = new Set<string>();
  array(query.sort, `${path}.sort`, 128).forEach((item, i) => {
    const sortPath = `${path}.sort[${i}]`, sort = object(item, sortPath, ["fieldId", "direction", "nulls"]);
    const id = identity(sort.fieldId, `${sortPath}.fieldId`);
    requireData(!seen.has(id), sortPath, "Duplicate sort field"); seen.add(id);
    choice(sort.direction, ["asc", "desc"], `${sortPath}.direction`); choice(sort.nulls, ["first", "last"], `${sortPath}.nulls`);
    if (fields) requireData(fields.has(id) && fields.get(id)!.type !== "multiSelect", sortPath, "Unsupported sort field");
  });
  if (query.filter !== undefined) checkFilter(query.filter, `${path}.filter`, fields, 1, { count: 0 });
  return value as DataQuery;
}

/** Checks view structure and references.
 * @param value - Candidate view.
 * @param fields - Known source fields.
 * @param path - Diagnostic location.
 * @returns Checked view.
 */
export function checkView(value: unknown, fields?: ReadonlyMap<string, DataField>, path = "$.view"): DataView {
  const view = object(value, path, ["id", "name", "type", "visibleFieldIds", "query", "columnWidths", "density", "summaries", "groupBy", "collapsedGroups", "showFieldNames"], ["id", "name", "type", "visibleFieldIds", "query"]);
  identity(view.id, `${path}.id`); text(view.name, `${path}.name`);
  const type = choice(view.type, ["table", "board"], `${path}.type`);
  const visible = identities(view.visibleFieldIds, `${path}.visibleFieldIds`);
  if (fields) for (const id of visible) requireData(fields.has(id), `${path}.visibleFieldIds`, `Unknown field ${id}`);
  checkQuery(view.query, fields, `${path}.query`);
  if (type === "board") {
    requireData(!["columnWidths", "density", "summaries"].some(key => Object.hasOwn(view, key)), path, "Board cannot define table settings");
    const id = identity(view.groupBy, `${path}.groupBy`);
    if (fields) requireData(fields.get(id)?.type === "singleSelect", `${path}.groupBy`, "Board requires a single-choice field");
    if (view.showFieldNames !== undefined) requireData(typeof view.showFieldNames === "boolean", path, "Expected field label visibility");
    if (view.collapsedGroups !== undefined) {
      const groups = array(view.collapsedGroups, `${path}.collapsedGroups`, 257), field = fields?.get(id);
      requireData(new Set(groups).size === groups.length, path, "Duplicate collapsed group");
      for (const group of groups) if (group !== null) {
        identity(group, `${path}.collapsedGroups`);
        if (field?.type === "singleSelect") requireData(field.options.some(option => option.id === group), path, "Unknown collapsed group");
      }
    }
  } else {
    requireData(!["groupBy", "collapsedGroups", "showFieldNames"].some(key => Object.hasOwn(view, key)), path, "Table cannot define board settings");
    if (view.density !== undefined) choice(view.density, ["compact", "standard", "comfortable"], `${path}.density`);
    if (view.summaries !== undefined) {
      requireData(view.summaries !== null && typeof view.summaries === "object" && !Array.isArray(view.summaries), path, "Expected summaries");
      for (const [id, kind] of Object.entries(view.summaries)) {
        identity(id, `${path}.summaries`); choice(kind, ["count", "sum", "average"], `${path}.summaries.${id}`);
        if (fields) requireData(fields.has(id) && (kind === "count" || fields.get(id)!.type === "number"), path, "Summary requires a compatible field");
      }
    }
    if (view.columnWidths !== undefined) {
      requireData(view.columnWidths !== null && typeof view.columnWidths === "object" && !Array.isArray(view.columnWidths), path, "Expected column widths");
      for (const [id, width] of Object.entries(view.columnWidths)) {
        identity(id, `${path}.columnWidths`);
        requireData(typeof width === "number" && Number.isFinite(width) && width > 0, path, "Column widths must be positive");
        if (fields) requireData(fields.has(id), path, "Unknown width field");
      }
    }
  }
  return value as DataView;
}

/** Removes references to a deleted field while preserving remaining predicates.
 * @param filter - Existing filter.
 * @param fieldId - Deleted field.
 * @returns Repaired filter, or undefined if no predicates remain.
 */
export function omitFilterField(filter: DataFilter | undefined, fieldId: string): DataFilter | undefined {
  if (!filter) return undefined;
  if ("fieldId" in filter) return filter.fieldId === fieldId ? undefined : filter;
  const key = "all" in filter ? "all" : "any";
  const children = ("all" in filter ? filter.all : filter.any).map(child => omitFilterField(child, fieldId)).filter((child): child is DataFilter => !!child);
  return children.length ? key === "all" ? { all: children } : { any: children } : undefined;
}
