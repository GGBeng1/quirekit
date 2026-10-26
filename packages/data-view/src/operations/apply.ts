import type { DataSet, DataView, DataViewEmbed } from "../model/types";
import { readDataSet, readDataView } from "../codec/json";
import { DataViewError, requireData } from "../validation/error";
import { copyJson } from "../validation/json";
import { changeFields, removeViewField, repairCollapsedGroups, revealAddedFields } from "./fields";
import { changeRecords } from "./records";
import type { DataMutationVersion, DataOperation, DataViewMutationOptions } from "./types";
import { validateDataOperation } from "./validate";

/** Produces a candidate batch without publishing partial operations.
 * @param data - Validated input.
 * @param operations - Detached changes.
 * @param version - Compare-and-swap versions.
 * @returns Candidate snapshot.
 */
function prepare(data: DataSet, operations: readonly DataOperation[], version: DataMutationVersion): DataSet {
  if (data.revision !== version.baseRevision) throw new DataViewError("conflict", "$.revision", "Data changed since this edit was prepared");
  requireData(typeof version.revision === "string" && !!version.revision && version.revision !== version.baseRevision, "$.revision", "A new revision is required");
  requireData(operations.length > 0 && operations.length <= 1000, "$.operations", "Expected 1–1000 operations");
  operations.forEach(validateDataOperation);
  let result = data;
  for (const operation of operations) {
    switch (operation.type) {
      case "set-cell": case "insert-record": case "delete-record": result = changeRecords(result, operation); break;
      case "add-field": case "replace-field": case "delete-field": result = changeFields(result, operation); break;
      default: throw new DataViewError("unsupported", "$.operation.type", "Unknown operation");
    }
  }
  return {...result, revision: version.revision};
}

/** Applies a complete dataset mutation atomically.
 * @param input - Authoritative snapshot.
 * @param operations - Typed changes.
 * @param version - Expected and next versions.
 * @returns Checked next snapshot; input remains unchanged on success or failure.
 */
export function applyDataSetOperations(input: DataSet, operations: readonly DataOperation[], version: DataMutationVersion): DataSet {
  return readDataSet(prepare(readDataSet(input), copyJson(operations), version));
}

/** Commits inline data and local reference repairs as one portable result.
 * @param input - Persistent inline embed.
 * @param operations - Atomic changes.
 * @param version - Optimistic version boundary.
 * @param options - Optional view-local projection changes in the same mutation.
 * @returns Complete next embed.
 */
export function applyDataViewOperations(input: DataViewEmbed, operations: readonly DataOperation[], version: DataMutationVersion, options?: DataViewMutationOptions): DataViewEmbed {
  const embed = readDataView(input);
  requireData(embed.source.kind === "inline", "$.source", "External writes belong to the host provider");
  const changes = copyJson(operations), dataset = prepare(embed.source.dataset, changes, version);
  let views = embed.views;
  for (const operation of changes) if (operation.type === "delete-field") views = views.map(view => removeViewField(view, operation));
  if (changes.some(operation => operation.type === "replace-field")) views = views.map(view => repairCollapsedGroups(view, dataset));
  views = revealAddedFields(views, changes, options?.showAddedFieldsIn, dataset);
  return readDataView({...embed, source: {kind: "inline", dataset}, views});
}

/** Updates only a persistent view without inventing a new dataset revision.
 * @param input - Current embed.
 * @param view - Full replacement for an existing view.
 * @returns Checked embed with unchanged source revision.
 */
export function replaceDataView(input: DataViewEmbed, view: DataView): DataViewEmbed {
  const embed = readDataView(input);
  requireData(embed.views.some(item => item.id === view.id), "$.view.id", "View no longer exists");
  return readDataView({...embed, views: embed.views.map(item => item.id === view.id ? view : item)});
}
