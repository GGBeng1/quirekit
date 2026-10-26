import type {
  QuireLayoutProviderEntry,
  QuireLayoutProviderRegistrationGap,
  QuireLayoutProviderRegistry,
  QuireLayoutProviderRegistryResult
} from "./types";

/**
 * Builds a deterministic layout-provider registry.
 *
 * @param entries - Provider entries in extension and declaration order.
 * @returns A valid lookup registry, or the structural gaps that invalidate it.
 */
export function createQuireLayoutProviderRegistrationRegistry<Provider = unknown>(
  entries: readonly QuireLayoutProviderEntry<Provider>[]
): QuireLayoutProviderRegistryResult<Provider> {
  const ids = new Map<string, QuireLayoutProviderEntry<Provider>[]>();
  const nodeTypes = new Map<string, QuireLayoutProviderEntry<Provider>[]>();

  for (const entry of entries) {
    const idEntries = ids.get(entry.id) ?? [];
    idEntries.push(entry);
    ids.set(entry.id, idEntries);

    for (const nodeType of entry.nodeTypes) {
      const nodeEntries = nodeTypes.get(nodeType) ?? [];
      if (!nodeEntries.includes(entry)) {
        nodeEntries.push(entry);
      }
      nodeTypes.set(nodeType, nodeEntries);
    }
  }

  const gaps: QuireLayoutProviderRegistrationGap<Provider>[] = [];

  for (const [id, idEntries] of ids) {
    if (idEntries.length > 1) {
      gaps.push({ code: "duplicate-layout-provider-id", id, entries: idEntries });
    }
  }

  for (const [nodeType, nodeEntries] of nodeTypes) {
    if (nodeEntries.length > 1) {
      gaps.push({
        code: "ambiguous-node-layout-provider",
        nodeType,
        entries: nodeEntries
      });
    }
  }

  if (gaps.length > 0) {
    return { valid: false, gaps };
  }

  const byId = new Map(ids);
  const byNodeType = new Map(nodeTypes);
  const registry: QuireLayoutProviderRegistry<Provider> = {
    entries: [...entries],
    getById: (id) => byId.get(id)?.[0],
    getByNodeType: (nodeType) => byNodeType.get(nodeType)?.[0]
  };

  return { valid: true, registry };
}
