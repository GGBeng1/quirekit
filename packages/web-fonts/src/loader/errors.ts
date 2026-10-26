import { normalizeQuireWebFontFamily } from "../resource/identity";
import { QuireWebFontError } from "../types";

/**
 * Validates and normalizes a requested family.
 *
 * @param family - Raw family.
 * @returns Normalized lookup key.
 */
export function requireQuireWebFontFamily(family: string): string {
  const normalized = normalizeQuireWebFontFamily(family);
  if (normalized.length === 0) throw new QuireWebFontError("catalog", "Font family is required");
  return normalized;
}

/**
 * Determines failures that must not silently switch provider/license tuples.
 *
 * @param error - Candidate failure.
 * @returns Whether installation must stop.
 */
export function isTerminalQuireWebFontError(error: unknown): boolean {
  return error instanceof QuireWebFontError &&
    (error.code === "authorization" || error.code === "integrity" || error.code === "destroyed");
}

/**
 * Normalizes an arbitrary lifecycle failure.
 *
 * @param error - Original failure.
 * @param family - Requested family.
 * @returns Typed product-facing diagnostic.
 */
export function asQuireWebFontError(error: unknown, family: string): QuireWebFontError {
  return error instanceof QuireWebFontError
    ? error
    : new QuireWebFontError("network", `Failed to install web font family "${family}"`, {
      cause: error
    });
}
