import type { DataOperation } from "./types";
import { DataViewError, requireData } from "../validation/error";
import { identity, object } from "../validation/primitives";

/** Checks operation shapes before applying any member of an atomic batch.
 * @param operation - Untrusted runtime operation.
 * @param index - Batch position for diagnostics.
 */
export function validateDataOperation(operation: DataOperation, index: number): void {
  const path = `$.operations[${index}]`;
  requireData(operation !== null && typeof operation === "object", path, "Expected an operation");
  switch (operation.type) {
    case "set-cell": object(operation, path, ["type", "recordId", "fieldId", "value"]); identity(operation.recordId, path); identity(operation.fieldId, path); break;
    case "insert-record": object(operation, path, ["type", "record"]); object(operation.record, `${path}.record`, ["id", "values"]); break;
    case "delete-record": object(operation, path, ["type", "recordId"]); identity(operation.recordId, path); break;
    case "add-field": object(operation, path, ["type", "field", "defaultValue"]); break;
    case "replace-field":
      object(operation, path, ["type", "field", "values"], ["type", "field"]);
      if (operation.values !== undefined) {
        requireData(operation.values !== null && typeof operation.values === "object" && !Array.isArray(operation.values), `${path}.values`, "Expected record conversion map");
      }
      break;
    case "delete-field": object(operation, path, ["type", "fieldId", "replacementGroupFieldId"], ["type", "fieldId"]);
      identity(operation.fieldId, path); if (operation.replacementGroupFieldId !== undefined) identity(operation.replacementGroupFieldId, path); break;
    default: throw new DataViewError("unsupported", `${path}.type`, "Unknown operation");
  }
}
