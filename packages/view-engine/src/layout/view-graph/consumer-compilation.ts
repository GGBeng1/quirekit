import {
  createQuireViewConsumerOwnerKey,
  type QuireViewConsumerCompilation
} from "../../view-graph/consumers";
import { resolveQuireLayoutInteractionQueryEntryNode } from "../query-index";
import type { QuireLayoutViewGraphConsumerCandidate } from "./types";
import type { QuireLayoutViewGraphProductionOptions } from "./types";

/**
 * Finalizes an incremental descriptor candidate under the graph query budget.
 *
 * @param candidate - Descriptors compiled while retained regions were produced.
 * @param options - Snapshot and graph performance authority.
 * @returns Complete ready view or whole-view unavailability.
 */
export function compileQuireLayoutViewGraphConsumers(
  candidate: QuireLayoutViewGraphConsumerCandidate,
  options: QuireLayoutViewGraphProductionOptions
): QuireViewConsumerCompilation {
  if (candidate.gaps.length > 0) {
    return { kind: "unavailable", gaps: candidate.gaps };
  }

  const budget = options.performance.queryBudget as
    typeof options.performance.queryBudget | undefined;

  if (budget === undefined) {
    return unavailable(
      "invalid-query-budget",
      "Consumer queries require an explicit query budget."
    );
  }

  if (budget.kind === "scan-bounded") {
    if (budget.maxScannedItems === undefined || budget.maxScannedItems <= 0) {
      return unavailable(
        "invalid-query-budget",
        "Scan-bounded consumer queries require a positive maxScannedItems cap."
      );
    }
    if (candidate.candidateCount > budget.maxScannedItems) {
      return {
        kind: "unavailable",
        gaps: [{
          code: "query-budget-exceeded",
          message: `Consumer candidate count ${candidate.candidateCount} exceeds scan cap ${budget.maxScannedItems}.`,
          candidateCount: candidate.candidateCount,
          maxScannedItems: budget.maxScannedItems
        }]
      };
    }

    return ready(candidate, candidate.ownerKeys);
  }

  if (budget.kind === "viewport-indexed" || budget.kind === "indexed") {
    const index = options.snapshot.interactionQueryIndex;
    if (index === undefined) {
      return unavailable(
        "missing-consumer-query-index",
        "Indexed consumer compilation requires the retained interaction query index."
      );
    }

    // Phase 1: consume only page/viewport buckets already selected by layout.
    // Unbucketed entries are intentionally unavailable to viewport queries.
    const entryIndexes = new Set(index.buckets.flatMap((bucket) => bucket.entryIndexes));
    const ownerKeys: string[] = [];
    const seen = new Set<string>();

    // Phase 2: resolve each indexed node to its exact retained region key. No
    // graph-region fallback scan is allowed when index ownership is incomplete.
    for (const entryIndex of entryIndexes) {
      const entry = index.entries[entryIndex];
      if (entry === undefined) {
        continue;
      }
      const node = resolveQuireLayoutInteractionQueryEntryNode(
        options.snapshot.root,
        entry
      );
      if (node?.viewRegion === undefined) {
        continue;
      }
      const key = createQuireViewConsumerOwnerKey(node.viewRegion);
      if (
        candidate.descriptorsByOwner[key] !== undefined
        && !seen.has(key)
      ) {
        seen.add(key);
        ownerKeys.push(key);
      }
    }

    return ready(candidate, ownerKeys);
  }

  if (candidate.candidateCount > 1) {
    return unavailable(
      "invalid-query-budget",
      `Constant consumer queries cannot expose ${candidate.candidateCount} candidates.`
    );
  }

  return ready(candidate, candidate.ownerKeys);
}

/**
 * Creates one available compilation without copying descriptor groups.
 *
 * @param candidate - Incremental descriptor candidate.
 * @param indexedOwnerKeys - Owner keys reachable under the active budget.
 * @returns Ready consumer compilation.
 */
function ready(
  candidate: QuireLayoutViewGraphConsumerCandidate,
  indexedOwnerKeys: readonly string[]
): QuireViewConsumerCompilation {
  return {
    kind: "ready",
    descriptorsByOwner: candidate.descriptorsByOwner,
    indexedOwnerKeys
  };
}

/**
 * Creates one whole-view unavailable compilation.
 *
 * @param code - Stable consumer compilation gap code.
 * @param message - Human-readable diagnostic explanation.
 * @returns Unavailable consumer compilation.
 */
function unavailable(
  code: "invalid-query-budget" | "missing-consumer-query-index",
  message: string
): QuireViewConsumerCompilation {
  return { kind: "unavailable", gaps: [{ code, message }] };
}
