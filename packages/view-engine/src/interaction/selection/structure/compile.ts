import type {
  QuireSelectionStructureIntervalIndex,
  QuireSelectionStructureIntervalIndexOptions,
  QuireSelectionStructureOwnerFact
} from "./types";
import {
  compareSelectionStructureOwnerFacts,
  createSelectionStructureIntervalIndex
} from "./interval-index";
import { compileSelectionStructureOwnerFact } from "./owner";
import {
  compileSelectionAdapters,
  readSelectionAdapterRegistry
} from "./registry";

/**
 * Compiles installed adapters and document nodes into one source interval index.
 *
 * @param options - Source document and optional Core registration authority.
 * @returns Immutable snapshot-owned structure interval index.
 */
export function createQuireSelectionStructureIntervalIndex(
  options: QuireSelectionStructureIntervalIndexOptions
): QuireSelectionStructureIntervalIndex {
  const registry = readSelectionAdapterRegistry(options.extensionManager);
  if (registry === undefined || registry.entries.length === 0) {
    return createSelectionStructureIntervalIndex([]);
  }

  const adaptersByNodeType = compileSelectionAdapters(registry);
  const entries: QuireSelectionStructureOwnerFact[] = [];

  // Compile source identity from the canonical PM document so pagination and
  // viewport clipping cannot duplicate or omit semantic owners.
  options.doc.descendants((node, position) => {
    const adapterEntry = adaptersByNodeType.get(node.type.name);
    if (adapterEntry === undefined) return true;

    entries.push(
      compileSelectionStructureOwnerFact(node, position, adapterEntry)
    );
    return true;
  });

  entries.sort(compareSelectionStructureOwnerFacts);
  return createSelectionStructureIntervalIndex(entries);
}
