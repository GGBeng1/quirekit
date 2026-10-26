import type { DataViewEmbed } from "./types";
import { readDataView } from "../codec/json";

/** Forks local data while preserving external reference semantics.
 * @param source - Copied embed.
 * @param id - Fresh host object identity.
 * @returns Independent local data or a new reference to the same external source.
 */
export function copyDataView(source: DataViewEmbed, id: string): DataViewEmbed {
  const embed = readDataView(source);
  return readDataView({...embed, id, source: embed.source.kind === "inline" ? {kind: "inline", dataset: {
    ...embed.source.dataset, id: `${id}:data`, revision: `${id}:initial`,
    records: embed.source.dataset.records.map((row, index) => ({...row, id: `${id}:row:${index}`}))
  }} : embed.source});
}
