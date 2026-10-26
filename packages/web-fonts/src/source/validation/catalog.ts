import type {
  QuireFontSourceCatalogPage,
  QuireFontSourceFamilySummary
} from "../types";
import {
  optionalNonNegativeInteger,
  optionalString,
  parseLicense,
  requireExactVersion,
  requireRecord,
  requireString,
  requireStringArray
} from "./shared";

/**
 * Validates one bounded catalog page.
 *
 * @param value - Unknown JSON response.
 * @param maxItems - Maximum accepted item count.
 * @returns Validated catalog page.
 */
export function parseQuireFontSourceCatalogPage(
  value: unknown,
  maxItems: number
): QuireFontSourceCatalogPage {
  const record = requireRecord(value, "font source catalog page");
  if (!Array.isArray(record.items) || record.items.length > maxItems) {
    throw new TypeError(`Font source catalog page must contain at most ${maxItems} items.`);
  }
  const total = optionalNonNegativeInteger(record.total, "catalog total");
  const nextCursor = optionalString(record.nextCursor, "next cursor");
  return Object.freeze({
    items: Object.freeze(record.items.map(parseFamilySummary)),
    ...(total === undefined ? {} : { total }),
    ...(nextCursor === undefined ? {} : { nextCursor })
  });
}

/**
 * Parses one searchable family summary.
 *
 * @param value - Unknown catalog entry.
 * @returns Valid immutable family summary.
 */
function parseFamilySummary(value: unknown): QuireFontSourceFamilySummary {
  const record = requireRecord(value, "font family summary");
  const displayName = optionalString(record.displayName, "display name");
  const category = optionalString(record.category, "category");
  return Object.freeze({
    familyId: requireString(record.familyId, "family id"),
    family: requireString(record.family, "CSS family"),
    version: requireExactVersion(record.version, "font version"),
    license: parseLicense(record.license),
    ...(displayName === undefined ? {} : { displayName }),
    ...(category === undefined ? {} : { category }),
    ...optionalArrayFields(record)
  });
}

/**
 * Parses optional family-array metadata.
 *
 * @param record - Family summary validation record.
 * @returns Present optional array fields.
 */
function optionalArrayFields(record: Record<string, unknown>): Partial<QuireFontSourceFamilySummary> {
  const result: Record<string, readonly string[]> = {};
  for (const key of ["subsets", "weights", "styles"] as const) {
    if (record[key] !== undefined) result[key] = requireStringArray(record[key], key);
  }
  return result;
}
