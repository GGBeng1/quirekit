import type { DataSet, DataSource, DataViewEmbed } from "../model/types";
import { checkDataset } from "./fields";
import { DataViewError, requireData } from "./error";
import { array, choice, extensions, identity, object, text } from "./primitives";
import { checkView } from "./query";

/** Checks exactly one source authority without accessing it.
 * @param value - Source descriptor.
 * @returns Checked descriptor.
 */
function checkSource(value: unknown): DataSource {
  const path = "$.source";
  requireData(value !== null && typeof value === "object", path, "Expected source");
  const kind = choice((value as Record<string, unknown>).kind, ["inline", "resource", "remote"], `${path}.kind`);
  if (kind === "inline") {
    const source = object(value, path, ["kind", "dataset"]); checkDataset(source.dataset, `${path}.dataset`);
  } else if (kind === "resource") {
    const source = object(value, path, ["kind", "datasetId", "ref"]);
    identity(source.datasetId, `${path}.datasetId`); requireData(text(source.ref, `${path}.ref`).length, path, "Missing resource reference");
  } else {
    const source = object(value, path, ["kind", "datasetId", "provider", "endpoint"], ["kind", "datasetId", "provider"]);
    identity(source.datasetId, `${path}.datasetId`); identity(source.provider, `${path}.provider`);
    if (source.endpoint !== undefined) requireData(text(source.endpoint, `${path}.endpoint`).length, path, "Empty endpoint");
  }
  return value as DataSource;
}

/** Checks a detached embed and its available field references.
 * @param value - JSON object.
 * @returns Checked embed.
 */
export function checkEmbed(value: unknown): DataViewEmbed {
  const embed = object(value, "$", ["format", "version", "id", "source", "views", "defaultViewId", "extensions"], ["format", "version", "id", "source", "views", "defaultViewId"]);
  requireData(embed.format === "quirekit-data-view", "$.format", "Expected quirekit-data-view");
  if (embed.version !== 1) throw new DataViewError("unsupported", "$.version", "Unsupported embed version");
  identity(embed.id, "$.id"); const source = checkSource(embed.source);
  const fields = source.kind === "inline" ? new Map(source.dataset.fields.map(field => [field.id, field])) : undefined;
  const views = array(embed.views, "$.views", 16, 1).map((view, i) => checkView(view, fields, `$.views[${i}]`));
  requireData(new Set(views.map(view => view.id)).size === views.length, "$.views", "Duplicate view identity");
  requireData(views.some(view => view.id === embed.defaultViewId), "$.defaultViewId", "Missing default view");
  extensions(embed.extensions, "$.extensions"); return value as DataViewEmbed;
}

/** Validates loaded external data against preserved view bindings.
 * @param embed - Source-backed embed.
 * @param dataset - Complete loaded source.
 */
export function validateDataViewBindings(embed: DataViewEmbed, dataset: DataSet): void {
  const id = embed.source.kind === "inline" ? embed.source.dataset.id : embed.source.datasetId;
  requireData(id === dataset.id, "$.source", "Loaded dataset identity differs from the binding");
  const fields = new Map(dataset.fields.map(field => [field.id, field]));
  embed.views.forEach((view, i) => checkView(view, fields, `$.views[${i}]`));
}
