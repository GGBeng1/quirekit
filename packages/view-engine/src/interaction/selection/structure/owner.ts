import type { QuireSelectionAdapterEntry } from "@quirekit/core/selection-adapter";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireSelectionAdapter,
  QuireSelectionAdapterUnit
} from "../../../selection-adapter";
import { QuireSelectionAdapterCompilationError } from "./errors";
import type {
  QuireSelectionStructureOwnerFact,
  QuireSelectionStructureUnitFact
} from "./types";

/**
 * Compiles one adapter-owned source node into immutable absolute facts.
 *
 * @param node - Exact source node owned by the adapter.
 * @param position - Absolute source position immediately before the node.
 * @param entry - Validated adapter registration.
 * @returns Compiled owner fact consumed by the interval index.
 */
export function compileSelectionStructureOwnerFact(
  node: ProseMirrorNode,
  position: number,
  entry: QuireSelectionAdapterEntry<QuireSelectionAdapter>
): QuireSelectionStructureOwnerFact {
  let units: readonly QuireSelectionAdapterUnit[];
  try {
    units = entry.adapter.compileUnits({ node, position });
  } catch (error) {
    throw new QuireSelectionAdapterCompilationError([
      `Adapter "${entry.id}" failed to compile "${node.type.name}" at ${position}: ${readErrorMessage(error)}`
    ]);
  }
  const compiledUnits = compileUnitFacts(entry, node, position, units);
  if (
    compiledUnits.length === 0
    && Object.values(entry.adapter.modes).includes("semantic-units")
  ) {
    throw new QuireSelectionAdapterCompilationError([
      `Adapter "${entry.id}" uses semantic-unit crossing without compiling any units for "${node.type.name}".`
    ]);
  }
  return {
    ownerId: `${entry.id}@${position}`,
    adapterId: entry.id,
    extensionName: entry.extensionName,
    nodeType: node.type.name,
    range: { from: position, to: position + node.nodeSize },
    modes: { ...entry.adapter.modes },
    commandDomain: entry.adapter.commandDomain,
    clipboardDomain: entry.adapter.clipboardDomain,
    mappingFallback: entry.adapter.mappingFallback,
    replacementFallback: entry.adapter.replacementFallback,
    units: compiledUnits
  };
}

/**
 * Validates and absolutizes one owner's semantic units.
 *
 * @param entry - Adapter that emitted the units.
 * @param node - Source node bounding every relative range.
 * @param position - Absolute source position immediately before the node.
 * @param units - Owner-relative units emitted by the adapter.
 * @returns Immutable absolute unit facts in source order.
 */
function compileUnitFacts(
  entry: QuireSelectionAdapterEntry<QuireSelectionAdapter>,
  node: ProseMirrorNode,
  position: number,
  units: readonly QuireSelectionAdapterUnit[]
): readonly QuireSelectionStructureUnitFact[] {
  if (!Array.isArray(units)) {
    throw new QuireSelectionAdapterCompilationError([
      `Adapter "${entry.id}" returned a non-array semantic unit collection.`
    ]);
  }

  const ids = new Set<string>();
  const compiled: QuireSelectionStructureUnitFact[] = [];
  let previousTo = 0;

  for (const unit of units) {
    if (
      typeof unit !== "object"
      || unit === null
      || typeof unit.id !== "string"
      || unit.id.length === 0
      || typeof unit.kind !== "string"
      || unit.kind.length === 0
      || !isValidRelativeRange(unit.range, node.nodeSize)
    ) {
      throw new QuireSelectionAdapterCompilationError([
        `Adapter "${entry.id}" returned an invalid semantic unit for "${node.type.name}".`
      ]);
    }
    if (ids.has(unit.id)) {
      throw new QuireSelectionAdapterCompilationError([
        `Adapter "${entry.id}" returned duplicate semantic unit id "${unit.id}".`
      ]);
    }
    if (unit.range.from < previousTo) {
      throw new QuireSelectionAdapterCompilationError([
        `Adapter "${entry.id}" semantic units overlap or are out of source order.`
      ]);
    }
    ids.add(unit.id);
    previousTo = unit.range.to;
    compiled.push({
      id: unit.id,
      kind: unit.kind,
      range: {
        from: position + unit.range.from,
        to: position + unit.range.to
      }
    });
  }

  return compiled;
}

/**
 * Reports whether an owner-relative source range is non-empty and contained.
 *
 * @param range - Candidate owner-relative range.
 * @param ownerSize - Complete source node size.
 * @returns Whether the range can become an indexed semantic unit.
 */
function isValidRelativeRange(
  range: QuireDocumentRange | undefined,
  ownerSize: number
): range is QuireDocumentRange {
  return range !== undefined
    && Number.isInteger(range.from)
    && Number.isInteger(range.to)
    && range.from >= 0
    && range.from < range.to
    && range.to <= ownerSize;
}

/**
 * Reads a deterministic message from an unknown callback failure.
 *
 * @param error - Unknown adapter compilation failure.
 * @returns Human-readable diagnostic suffix.
 */
function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
