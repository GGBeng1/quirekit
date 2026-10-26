import {
  QUIRE_DEFAULT_SELECTION_ADAPTER_PRIORITY,
  type QuireSelectionAdapterEntry,
  type QuireSelectionAdapterRegistrationGap,
  type QuireSelectionAdapterRegistry,
  type QuireSelectionAdapterRegistryResult
} from "./types";

/**
 * Builds a deterministic selection adapter registry.
 *
 * @param entries - Adapter entries in extension and declaration order.
 * @returns A valid priority-aware registry, or structural registration gaps.
 */
export function createQuireSelectionAdapterRegistry<Adapter = unknown>(
  entries: readonly QuireSelectionAdapterEntry<Adapter>[]
): QuireSelectionAdapterRegistryResult<Adapter> {
  const declarationOrder = new Map(
    entries.map((entry, index) => [entry, index] as const)
  );
  const orderedEntries = [...entries].sort((left, right) => {
    const priorityDelta =
      getQuireSelectionAdapterPriority(right) -
      getQuireSelectionAdapterPriority(left);

    return priorityDelta === 0
      ? (declarationOrder.get(left) ?? 0) - (declarationOrder.get(right) ?? 0)
      : priorityDelta;
  });
  const ids = new Map<string, QuireSelectionAdapterEntry<Adapter>[]>();
  const nodeTypes = new Map<string, QuireSelectionAdapterEntry<Adapter>[]>();

  // Index the already-sorted entries so every lookup observes one precedence order.
  for (const entry of orderedEntries) {
    const idEntries = ids.get(entry.id) ?? [];
    idEntries.push(entry);
    ids.set(entry.id, idEntries);

    for (const nodeType of new Set(entry.nodeTypes)) {
      const nodeEntries = nodeTypes.get(nodeType) ?? [];
      nodeEntries.push(entry);
      nodeTypes.set(nodeType, nodeEntries);
    }
  }

  const gaps: QuireSelectionAdapterRegistrationGap<Adapter>[] = [];

  for (const [id, idEntries] of ids) {
    if (idEntries.length > 1) {
      gaps.push({
        code: "duplicate-selection-adapter-id",
        id,
        entries: idEntries
      });
    }
  }

  // A priority tier must have one owner so fallback remains deterministic.
  for (const [nodeType, nodeEntries] of nodeTypes) {
    const entriesByPriority = new Map<
      number,
      QuireSelectionAdapterEntry<Adapter>[]
    >();

    for (const entry of nodeEntries) {
      const priority = getQuireSelectionAdapterPriority(entry);
      const priorityEntries = entriesByPriority.get(priority) ?? [];
      priorityEntries.push(entry);
      entriesByPriority.set(priority, priorityEntries);
    }

    for (const [priority, priorityEntries] of entriesByPriority) {
      if (priorityEntries.length > 1) {
        gaps.push({
          code: "ambiguous-node-selection-adapter",
          nodeType,
          priority,
          entries: priorityEntries
        });
      }
    }
  }

  if (gaps.length > 0) {
    return { valid: false, gaps };
  }

  const byId = new Map(
    [...ids].map(([id, idEntries]) => [id, idEntries[0]] as const)
  );
  const registry: QuireSelectionAdapterRegistry<Adapter> = {
    entries: orderedEntries,
    getById: (id) => byId.get(id),
    getByNodeType: (nodeType) => nodeTypes.get(nodeType)?.[0],
    getCandidatesByNodeType: (nodeType) => nodeTypes.get(nodeType) ?? []
  };

  return { valid: true, registry };
}

/**
 * Resolves the numeric priority used for adapter ordering.
 *
 * @param entry - Adapter registration whose priority should be normalized.
 * @returns Explicit adapter priority or the public default priority.
 */
function getQuireSelectionAdapterPriority(
  entry: QuireSelectionAdapterEntry
): number {
  return entry.priority ?? QUIRE_DEFAULT_SELECTION_ADAPTER_PRIORITY;
}
