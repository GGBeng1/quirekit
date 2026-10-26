import { isPlainObject } from "./isPlainObject";

/**
 * Merges extension options in the same broad direction as Tiptap configure:
 * plain objects merge recursively and other values replace the previous value.
 *
 * @param base - Base option object.
 * @param overrides - Caller-provided option overrides.
 * @returns Merged option object.
 */
export function mergeExtensionOptions<Options extends object>(
  base: Readonly<Options>,
  overrides: Partial<Options>
): Options {
  return mergeDeep(base, overrides) as Options;
}

/**
 * Recursively merges plain object properties.
 *
 * @param base - Base object to merge from.
 * @param overrides - Override object to merge on top.
 * @returns Merged object.
 */
export function mergeDeep(
  base: Readonly<Record<string, unknown>>,
  overrides: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const existing = merged[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      merged[key] = mergeDeep(existing, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}
