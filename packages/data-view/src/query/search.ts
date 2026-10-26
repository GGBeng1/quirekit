import type { DataRecord, DataSet } from "../model/types";
import { formatDataValue } from "../model/format";
import { requireData } from "../validation/error";

/** @param value - Literal user text. @returns Comparable Unicode text without locale-dependent casing. */
function normalize(value: string): string { return value.normalize("NFKC").toLowerCase(); }

/** Compiles one transient search without altering authored filters or source records.
 * @param data - Complete schema, including hidden fields.
 * @param search - Bounded literal text; whitespace means no search.
 * @returns Record predicate, or undefined when every filtered row should be retained.
 */
export function recordSearch(data: DataSet, search?: string): ((record: DataRecord) => boolean) | undefined {
  if (search === undefined) return undefined;
  requireData(typeof search === "string" && search.length <= 256, "$.search", "Search must contain at most 256 characters");
  const needle = normalize(search.trim());
  if (!needle) return undefined;
  return record => data.fields.some(field => {
    const value = record.values[field.id]!;
    return value !== null && normalize(formatDataValue(field, value)).includes(needle);
  });
}
