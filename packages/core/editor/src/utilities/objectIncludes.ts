import { isRegExp } from "./isRegExp";

/** Options for object subset matching. */
export interface ObjectIncludesOptions {
  /** Whether values must match strictly instead of allowing RegExp checks. */
  readonly strict: boolean;
}

/**
 * Checks whether an object includes all key/value pairs from another object.
 *
 * @param object - Object to inspect.
 * @param subset - Required key/value pairs.
 * @param options - Matching options.
 * @returns Whether `object` includes `subset`.
 */
export function objectIncludes(
  object: Readonly<Record<string, unknown>>,
  subset: Readonly<Record<string, unknown>>,
  options: ObjectIncludesOptions = { strict: true }
): boolean {
  return Object.entries(subset).every(([key, value]) => {
    if (!options.strict && isRegExp(value)) {
      return value.test(String(object[key]));
    }

    return object[key] === value;
  });
}
