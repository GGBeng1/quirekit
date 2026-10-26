import type {
  QuireSelectionAdapterEntry,
  QuireSelectionAdapterRegistry
} from "@quirekit/core/selection-adapter";
import type {
  QuireSelectionAdapter,
  QuireSelectionAdapterMode
} from "../../../selection-adapter";
import { QuireSelectionAdapterCompilationError } from "./errors";
import type {
  QuireSelectionStructureIntervalIndexOptions
} from "./types";

/**
 * Reads the valid Core registry or rejects an ambiguous installation.
 *
 * @param extensionManager - Optional Core adapter registration authority.
 * @returns Valid adapter registry, or undefined when no editor is mounted.
 */
export function readSelectionAdapterRegistry(
  extensionManager:
    QuireSelectionStructureIntervalIndexOptions["extensionManager"]
): QuireSelectionAdapterRegistry | undefined {
  if (extensionManager === undefined) return undefined;
  if (extensionManager.selectionAdapterRegistry === null) {
    throw new QuireSelectionAdapterCompilationError([
      "Core rejected duplicate or ambiguous selection adapters."
    ]);
  }
  return extensionManager.selectionAdapterRegistry;
}

/**
 * Validates opaque payloads and resolves one winning adapter per node type.
 *
 * @param registry - Priority-aware Core registration authority.
 * @returns Typed adapter entries keyed by handled ProseMirror node type.
 */
export function compileSelectionAdapters(
  registry: QuireSelectionAdapterRegistry
): ReadonlyMap<string, QuireSelectionAdapterEntry<QuireSelectionAdapter>> {
  const typedEntries = new Map<
    string,
    QuireSelectionAdapterEntry<QuireSelectionAdapter>
  >();
  const validatedEntries = new Map<
    QuireSelectionAdapterEntry,
    QuireSelectionAdapterEntry<QuireSelectionAdapter>
  >();

  for (const entry of registry.entries) {
    validatedEntries.set(entry, readTypedSelectionAdapter(entry));
  }

  for (const entry of registry.entries) {
    const typedEntry = validatedEntries.get(entry);
    if (typedEntry === undefined) continue;
    for (const nodeType of entry.nodeTypes) {
      if (registry.getByNodeType(nodeType) === entry) {
        typedEntries.set(nodeType, typedEntry);
      }
    }
  }

  return typedEntries;
}

/**
 * Validates one opaque Core payload and repeated registration metadata.
 *
 * @param entry - Core-owned adapter registration.
 * @returns Typed adapter entry accepted by View Engine.
 */
function readTypedSelectionAdapter(
  entry: QuireSelectionAdapterEntry
): QuireSelectionAdapterEntry<QuireSelectionAdapter> {
  if (!isSelectionAdapter(entry.adapter)) {
    throw new QuireSelectionAdapterCompilationError([
      `Extension "${entry.extensionName}" registered adapter "${entry.id}" with an invalid payload.`
    ]);
  }
  if (
    entry.adapter.id !== entry.id
    || !sameStrings(entry.adapter.nodeTypes, entry.nodeTypes)
  ) {
    throw new QuireSelectionAdapterCompilationError([
      `Extension "${entry.extensionName}" registration metadata disagrees with adapter "${entry.id}".`
    ]);
  }
  return entry as QuireSelectionAdapterEntry<QuireSelectionAdapter>;
}

/**
 * Reports whether an opaque value has the complete adapter authoring shape.
 *
 * @param value - Opaque Core payload.
 * @returns Whether the payload can be compiled by View Engine.
 */
function isSelectionAdapter(value: unknown): value is QuireSelectionAdapter {
  if (typeof value !== "object" || value === null) return false;
  const adapter = value as Partial<QuireSelectionAdapter>;
  const modes = adapter.modes;
  return adapter.version === 1
    && typeof adapter.id === "string"
    && adapter.id.length > 0
    && Array.isArray(adapter.nodeTypes)
    && adapter.nodeTypes.length > 0
    && adapter.nodeTypes.every((nodeType) =>
      typeof nodeType === "string" && nodeType.length > 0
    )
    && typeof modes === "object"
    && modes !== null
    && isSelectionAdapterMode(modes.internal)
    && isSelectionAdapterMode(modes.entry)
    && isSelectionAdapterMode(modes.exit)
    && isSelectionAdapterMode(modes.fullyCrossed)
    && typeof adapter.commandDomain === "string"
    && adapter.commandDomain.length > 0
    && typeof adapter.clipboardDomain === "string"
    && adapter.clipboardDomain.length > 0
    && (
      adapter.mappingFallback === "nearest"
      || adapter.mappingFallback === "text"
      || adapter.mappingFallback === "remove"
    )
    && (
      adapter.replacementFallback === "owner"
      || adapter.replacementFallback === "text"
      || adapter.replacementFallback === "reject"
    )
    && typeof adapter.compileUnits === "function";
}

/**
 * Reports whether a value is one supported crossing decision.
 *
 * @param value - Candidate crossing mode.
 * @returns Whether the value belongs to the adapter mode union.
 */
function isSelectionAdapterMode(
  value: unknown
): value is QuireSelectionAdapterMode {
  return value === "delegate"
    || value === "semantic-units"
    || value === "owner"
    || value === "skip";
}

/**
 * Reports whether two ordered string lists are identical.
 *
 * @param left - First metadata list.
 * @param right - Second metadata list.
 * @returns Whether both lists contain equal values in equal order.
 */
function sameStrings(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}
