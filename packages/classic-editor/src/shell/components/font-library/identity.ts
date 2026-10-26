/**
 * Normalizes one optional family value.
 *
 * @param value - Candidate family value.
 * @returns Trimmed family, or null.
 */
export function readClassicFontFamily(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

/**
 * Normalizes one CSS family identity for compact-picker comparison.
 *
 * @param family - Logical family spelling.
 * @returns Trimmed case-insensitive identity.
 */
export function normalizeClassicFontFamily(family: string): string {
  return family.trim().toLocaleLowerCase();
}
