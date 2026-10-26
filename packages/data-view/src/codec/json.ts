import type { DataSet, DataViewEmbed } from "../model/types";
import { checkEmbed } from "../validation/embed";
import { checkDataset } from "../validation/fields";
import { DataViewError } from "../validation/error";
import { checkJsonSize, copyJson } from "../validation/json";

/** Reads detached, fully checked portable view data.
 * @param value - Untrusted JSON-compatible input.
 * @returns Validated independent embed.
 */
export function readDataView(value: unknown): DataViewEmbed { return checkEmbed(copyJson(value)); }

/** Reads a complete dataset within the local snapshot budget.
 * @param value - Untrusted dataset.
 * @returns Validated independent snapshot.
 */
export function readDataSet(value: unknown): DataSet { return checkDataset(copyJson(value)); }

/** Parses JSON while preserving a useful diagnostic for malformed source.
 * @param source - JSON source.
 * @returns Detached JSON value.
 */
function parseJson(source: string): unknown {
  checkJsonSize(source);
  try { return JSON.parse(source); } catch { throw new DataViewError("invalid", "$", "Malformed JSON; original source must be preserved"); }
}

/** Parses a portable embed.
 * @param source - JSON text.
 * @returns Checked embed.
 */
export function parseDataView(source: string): DataViewEmbed { return readDataView(parseJson(source)); }

/** Parses a complete local dataset snapshot.
 * @param source - JSON text.
 * @returns Checked dataset.
 */
export function parseDataSet(source: string): DataSet { return readDataSet(parseJson(source)); }

/** Serializes checked data without exposing mutable runtime state.
 * @param embed - Persistent embed.
 * @returns Canonical JSON source.
 */
export function serializeDataView(embed: DataViewEmbed): string { return JSON.stringify(readDataView(embed)); }

/** Encodes a source fence that cell text cannot prematurely close.
 * @param embed - Persistent embed.
 * @returns Standalone Markdown block.
 */
export function dataViewMarkdown(embed: DataViewEmbed): string {
  const source = serializeDataView(embed).replaceAll("`", "\\u0060");
  return `\`\`\`quirekit-data-view\n${source}\n\`\`\``;
}
