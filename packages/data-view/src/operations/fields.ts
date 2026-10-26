import type { DataSet, DataView } from "../model/types";
import { requireData } from "../validation/error";
import { omitFilterField } from "../validation/query";
import type { DataOperation } from "./types";

/** Applies a field operation without committing any intermediate state.
 * @param data - Intermediate dataset.
 * @param operation - Field operation.
 * @returns Candidate dataset; final validation owns type conversion refusal.
 */
export function changeFields(data: DataSet, operation: Extract<DataOperation, {type: "add-field" | "replace-field" | "delete-field"}>): DataSet {
  if (operation.type === "add-field") {
    requireData(!data.fields.some(field => field.id === operation.field.id), "$.operation.field.id", "Field already exists");
    return {...data, fields: [...data.fields, operation.field], records: data.records.map(row => ({...row, values: {...row.values, [operation.field.id]: operation.defaultValue}}))};
  }
  const id = operation.type === "replace-field" ? operation.field.id : operation.fieldId;
  requireData(data.fields.some(field => field.id === id), "$.operation.fieldId", "Field no longer exists");
  if (operation.type === "replace-field") {
    for (const recordId of Object.keys(operation.values ?? {})) requireData(data.records.some(row => row.id === recordId), "$.operation.values", "Conversion references an unknown record");
    return {...data, fields: data.fields.map(field => field.id === id ? operation.field : field), records: data.records.map(row => {
      const values = operation.values;
      return values && Object.hasOwn(values, row.id) ? {...row, values: {...row.values, [id]: values[row.id]!}} : row;
    })};
  }
  requireData(id !== data.primaryFieldId, "$.operation.fieldId", "Cannot delete the title field");
  return {...data, fields: data.fields.filter(field => field.id !== id), records: data.records.map(row => ({...row,
    values: Object.fromEntries(Object.entries(row.values).filter(([fieldId]) => fieldId !== id))}))};
}

/** Repairs local view references in the same document transaction as field deletion.
 * @param view - Current view.
 * @param operation - Field removal and optional board replacement.
 * @returns View without dangling references.
 */
export function removeViewField(view: DataView, operation: Extract<DataOperation, {type: "delete-field"}>): DataView {
  const filter = omitFilterField(view.query.filter, operation.fieldId);
  const common = {...view, visibleFieldIds: view.visibleFieldIds.filter(id => id !== operation.fieldId),
    query: {sort: view.query.sort.filter(sort => sort.fieldId !== operation.fieldId), ...(filter ? {filter} : {})}};
  if (view.type === "board") {
    if (view.groupBy !== operation.fieldId) return {...common, type: "board", groupBy: view.groupBy};
    requireData(operation.replacementGroupFieldId, "$.operation.replacementGroupFieldId", "Choose a replacement before deleting a board grouping field");
    return {...common, type: "board", groupBy: operation.replacementGroupFieldId, collapsedGroups: []};
  }
  return {...common, type: "table", ...(view.columnWidths ? {columnWidths: Object.fromEntries(Object.entries(view.columnWidths).filter(([id]) => id !== operation.fieldId))} : {}),
    ...(view.summaries ? {summaries: Object.fromEntries(Object.entries(view.summaries).filter(([id]) => id !== operation.fieldId))} : {})};
}

/** Drops collapsed options removed by a schema edit, without modifying records.
 * @param view - Current projection.
 * @param data - Candidate authoritative schema.
 * @returns View with live collapse references.
 */
export function repairCollapsedGroups(view: DataView, data: DataSet): DataView {
  if (view.type !== "board" || !view.collapsedGroups) return view;
  const field = data.fields.find(field => field.id === view.groupBy);
  if (field?.type !== "singleSelect") return view;
  return {...view, collapsedGroups: view.collapsedGroups.filter(id => id === null || field.options.some(option => option.id === id))};
}

/** Reveals additions in one authored view before the complete embed is validated.
 * @param views - Projections after reference repair.
 * @param operations - Dataset changes in the same transaction.
 * @param viewId - Explicit target, or no visibility change.
 * @param data - Final schema after the complete batch.
 * @returns Projections with additions appended in mutation order.
 */
export function revealAddedFields(views: readonly DataView[], operations: readonly DataOperation[], viewId: string | undefined, data: DataSet): readonly DataView[] {
  if (viewId === undefined) return views;
  requireData(views.some(view => view.id === viewId), "$.options.showAddedFieldsIn", "View no longer exists");
  const live = new Set(data.fields.map(field => field.id));
  const added = operations.flatMap(operation => operation.type === "add-field" && live.has(operation.field.id) ? [operation.field.id] : []);
  return views.map(view => view.id === viewId ? {...view, visibleFieldIds: [...new Set([...view.visibleFieldIds, ...added])]} : view);
}
