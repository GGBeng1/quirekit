import type { WordTableStyleRegistry } from "../types";

/** Registry with no table styles. */
export const emptyWordTableStyleRegistry: WordTableStyleRegistry = Object.freeze({
  version: 1,
  styles: Object.freeze({}),
  defaultStyleId: null
});

/**
 * Reads the document table-style registry from `doc.attrs.wordTableStyleRegistry`.
 *
 * @param value - Candidate document attribute.
 * @returns Valid registry, or the empty registry for absent or malformed values.
 */
export function resolveWordTableStyleRegistry(value: unknown): WordTableStyleRegistry {
  if (value === null || typeof value !== "object") return emptyWordTableStyleRegistry;
  // Document attributes are immutable; one registry identity lets per-table caches hit across frames.
  const cached = resolvedRegistries.get(value);
  if (cached !== undefined) return cached;
  const registry = value as Partial<WordTableStyleRegistry>;
  const resolved: WordTableStyleRegistry = registry.version !== 1 || registry.styles === null || typeof registry.styles !== "object"
    ? emptyWordTableStyleRegistry
    : { version: 1, styles: registry.styles, defaultStyleId: typeof registry.defaultStyleId === "string" ? registry.defaultStyleId : null };
  resolvedRegistries.set(value, resolved);
  return resolved;
}

/** Normalized registries by their source attribute object. */
const resolvedRegistries = new WeakMap<object, WordTableStyleRegistry>();

/**
 * Returns a registry with one definition inserted or replaced.
 *
 * @param registry - Current registry.
 * @param definition - Definition to install.
 * @returns New registry; the input is not mutated.
 */
export function installWordTableStyleDefinition(
  registry: WordTableStyleRegistry,
  definition: WordTableStyleRegistry["styles"][string]
): WordTableStyleRegistry {
  return {
    ...registry,
    styles: { ...registry.styles, [definition.id]: definition }
  };
}

const registrySignatures = new WeakMap<object, string>();

/**
 * Creates a content signature for layout cache identity.
 *
 * Registry objects are immutable document attributes, so the serialized form is
 * computed once per registry instance.
 *
 * @param registry - Document table-style registry.
 * @returns Stable signature string.
 */
export function createWordTableStyleRegistrySignature(registry: WordTableStyleRegistry): string {
  const cached = registrySignatures.get(registry);
  if (cached !== undefined) return cached;
  const signature = `word-table-styles:${JSON.stringify(registry)}`;
  registrySignatures.set(registry, signature);
  return signature;
}
