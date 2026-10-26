import type { Input, Tree } from "@lezer/common";
import { collectReferences } from "../references/collect";
import { compareReferences, referenceEntries } from "../references/summary";
import type { ReferenceDefinitions, ReferenceParseWork } from "./types";

/**
 * Separates definition changes from label changes, without trusting edit locality.
 * @param tree - Complete structural pass.
 * @param input - Canonical source, read only on native chunk cache misses.
 * @param work - All collection, comparison and label materialization work.
 * @param previous - Previous immutable definition snapshot, if available.
 * @returns Reused definitions and/or label set only after exact equivalence checks.
 */
export function definitionSnapshot(tree: Tree, input: Input, work: ReferenceParseWork, previous?: ReferenceDefinitions): ReferenceDefinitions {
  const collection = { builds: 0, visitedNodes: 0, reusedChunks: 0, definitionsRead: 0, copiedDefinitions: 0, summaryLinks: 0, definitions: 0 };
  const entries = collectReferences(tree, 0, { sliceDoc: (from, to) => input.read(from, to) }, collection);
  work.definitionNodes += collection.visitedNodes; work.definitionChunks += collection.reusedChunks;
  work.definitionsRead += collection.definitionsRead; work.copiedDefinitions += collection.copiedDefinitions;
  work.summaryLinks += collection.summaryLinks;

  // Position is deliberately absent: shifting unchanged definitions does not
  // alter destinations or first-definition precedence. Reordering still does.
  if (previous) {
    const same = compareReferences(previous.entries, entries, work);
    if (same.entries) return previous;
    if (same.labels) return { entries, labels: previous.labels };
  }

  work.labelBuilds++; work.labelReads += entries.size;
  const labels = new Set<string>();
  for (const value of referenceEntries(entries)) labels.add(value.label);
  // Different order/duplicate count can preserve the label set. Reuse its
  // certification identity, while keeping the new ordered destination summary.
  if (previous?.labels.size === labels.size && [...labels].every(label => {
    work.definitionComparisons++; return previous.labels.has(label);
  })) return { entries, labels: previous.labels };
  return { entries, labels };
}
