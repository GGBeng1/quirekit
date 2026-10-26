import type { QuireViewContextKey } from "./types";

/**
 * Creates a typed key for qkView scope-local provide/inject.
 *
 * @param name - Human-readable name for diagnostics.
 * @returns Unique context key.
 */
export function createQuireViewContextKey<TValue>(
  name: string
): QuireViewContextKey<TValue> {
  return Object.freeze({
    id: Symbol(name),
    name
  });
}
