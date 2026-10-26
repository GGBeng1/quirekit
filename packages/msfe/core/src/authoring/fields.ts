import type { DefinitionLayer } from "./types";

/** @param layer - Most-derived definition. @param key - Scalar field. @returns Nearest defined value. */
export function field(layer: DefinitionLayer | undefined, key: string): unknown {
  if (!layer) return undefined;
  return layer.config[key] === undefined ? field(layer.parent, key) : layer.config[key];
}

/**
 * Resolves hooks without binding them to a parent instance: parent methods observe child options/storage.
 * @param layer - Most-derived declaration.
 * @param key - Hook name.
 * @param context - Installation-local context, with a late editor getter.
 * @returns Bound hook, or undefined when the full inheritance chain omits it.
 */
export function hook(layer: DefinitionLayer | undefined, key: string, context: object): ((...args: never[]) => unknown) | undefined {
  if (!layer) return undefined;
  const method = layer.config[key];
  if (method === undefined) return hook(layer.parent, key, context);
  if (typeof method !== "function") throw new Error(`invalid-extension-hook: ${key}`);
  const parent = hook(layer.parent, key, context);
  return (...args) => method.apply(Object.create(context, { parent: { value: parent } }), args);
}
