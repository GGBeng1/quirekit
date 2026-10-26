import type { DataSet } from "../model/types";
import { requireData } from "../validation/error";
import type { DataOperation } from "./types";

/** Applies a record operation to a detached intermediate snapshot.
 * @param data - Current intermediate data.
 * @param operation - Record operation.
 * @returns New intermediate dataset.
 */
export function changeRecords(data: DataSet, operation: Extract<DataOperation, {type: "set-cell" | "insert-record" | "delete-record"}>): DataSet {
  if (operation.type === "insert-record") {
    requireData(!data.records.some(row => row.id === operation.record.id), "$.operation.record.id", "Record already exists");
    return {...data, records: [...data.records, operation.record]};
  }
  requireData(data.records.some(row => row.id === operation.recordId), "$.operation.recordId", "Record no longer exists");
  if (operation.type === "delete-record") return {...data, records: data.records.filter(row => row.id !== operation.recordId)};
  requireData(data.fields.some(field => field.id === operation.fieldId), "$.operation.fieldId", "Field no longer exists");
  return {...data, records: data.records.map(row => row.id === operation.recordId ? {...row, values: {...row.values, [operation.fieldId]: operation.value}} : row)};
}
