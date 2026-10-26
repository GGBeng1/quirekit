import { normalizeQuireWebFontFamily } from "@quirekit/web-fonts";
import type { ClassicEditorWebFontFamily } from "../../../types";

/**
 * Resolves one stable provider-local family identity with legacy fallback.
 *
 * @param family - Provider family metadata.
 * @returns Stable provider-local identity.
 */
export function resolveClassicWebFontFamilyId(
  family: ClassicEditorWebFontFamily
): string {
  return family.familyId?.trim() || normalizeQuireWebFontFamily(family.family);
}

/**
 * Builds the collision-safe imported-record key for one source family.
 *
 * @param family - Provider family metadata.
 * @returns Source-scoped family identity.
 */
export function createClassicWebFontRecordKey(
  family: ClassicEditorWebFontFamily
): string {
  return `${family.sourceId}\u0000${resolveClassicWebFontFamilyId(family)}`;
}

/**
 * Finds the latest record matching one CSS family.
 *
 * @param records - Source-scoped family records.
 * @param family - Exact CSS family requested by the loader.
 * @returns Matching record or `undefined`.
 */
export function findClassicWebFontByCssFamily<T extends ClassicEditorWebFontFamily>(
  records: ReadonlyMap<string, T>,
  family: string
): T | undefined {
  const normalized = normalizeQuireWebFontFamily(family);
  return [...records.values()].reverse().find(
    (record) => normalizeQuireWebFontFamily(record.family) === normalized
  );
}
