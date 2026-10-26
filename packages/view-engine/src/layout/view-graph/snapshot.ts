import { validateQuireViewGraphSnapshot } from "../../view-graph";
import type {
  QuireViewConsumerCompilationGap,
  QuireViewSharedConsumerDescriptor
} from "../../view-graph/consumers";
import type {
  QuireLayoutRegion
} from "@quirekit/layout/identity";
import type {
  QuireViewGraphSnapshot
} from "../../view-graph";
import {
  collectLayoutViewGraphNodeEntries,
  collectLayoutViewGraphRoots
} from "./collect";
import type {
  QuireLayoutViewGraphProductionGap,
  QuireLayoutViewGraphProductionOptions,
  QuireLayoutViewGraphProductionResult
} from "./types";
import { compileQuireLayoutViewGraphConsumers } from "./consumer-compilation";
import {
  adaptQuireLayoutNodeRegion,
  appendQuireLayoutRegionCandidate,
  areQuireLayoutRegionsEqual,
  createQuireLayoutRegionKey
} from "./region";

/**
 * Creates a retained view graph from explicitly annotated layout products.
 *
 * The producer is intentionally strict: it does not infer roots, regions, or
 * capabilities from layout-snapshot input shapes. Missing products are reported
 * as production gaps so canonical contracts do not bend around old code paths.
 *
 * @param options - Layout snapshot and graph production options.
 * @returns Canonical view graph when all required products are present.
 */
export function createQuireLayoutSnapshotViewGraph(
  options: QuireLayoutViewGraphProductionOptions
): QuireLayoutViewGraphProductionResult {
  const entries = collectLayoutViewGraphNodeEntries(options.snapshot.root);
  const roots = collectLayoutViewGraphRoots(
    entries,
    options.regionProducts.roots
  );
  const rootsById = new Map(roots.map((root) => [root.id.value, root]));
  const gaps: QuireLayoutViewGraphProductionGap[] = [];
  const regions: QuireLayoutRegion[] = [];
  const regionsByKey = new Map<string, QuireLayoutRegion>();
  const descriptorsByOwner: Record<string, QuireViewSharedConsumerDescriptor> = {};
  const descriptorOwnerKeys: string[] = [];
  const consumerGaps: QuireViewConsumerCompilationGap[] = [];

  // Phase 1: retained product regions already carry explicit ownership. Compile
  // each descriptor as the region enters this graph candidate.
  for (const region of options.regionProducts.regions) {
    appendQuireLayoutRegionCandidate({
      region,
      rootsById,
      regions,
      regionsByKey,
      descriptorsByOwner,
      descriptorOwnerKeys,
      consumerGaps
    });
  }

  for (const entry of entries) {
    const region = adaptQuireLayoutNodeRegion(entry.node, rootsById, gaps);

    if (region !== null) {
      const key = createQuireLayoutRegionKey(region);
      const existing = regionsByKey.get(key);
      if (existing === undefined) {
        appendQuireLayoutRegionCandidate({
          region,
          rootsById,
          regions,
          regionsByKey,
          descriptorsByOwner,
          descriptorOwnerKeys,
          consumerGaps
        });
      } else if (!areQuireLayoutRegionsEqual(existing, region)) {
        gaps.push({
          code: "conflicting-view-region",
          message: `Layout node "${entry.node.id}" conflicts with retained region "${key}".`,
          nodeId: entry.node.id,
          range: entry.node.range
        });
      }
    }
  }

  if (gaps.length > 0) {
    return {
      graph: null,
      consumerCompilation: {
        kind: "unavailable",
        gaps: [{
          code: "invalid-view-graph",
          message: "Retained graph production gaps make consumer products unavailable."
        }]
      },
      gaps
    };
  }

  const graph: QuireViewGraphSnapshot = {
    version: options.version,
    performance: options.performance,
    roots,
    regions
  };

  return validateCandidateGraph(graph, options, {
    descriptorsByOwner,
    ownerKeys: descriptorOwnerKeys,
    gaps: consumerGaps,
    candidateCount: regions.length
  });
}

/**
 * Validates a candidate graph and converts invariant failures to production gaps.
 *
 * @param graph - Candidate retained view graph.
 * @returns Production result for the candidate graph.
 */
function validateCandidateGraph(
  graph: QuireViewGraphSnapshot,
  options: QuireLayoutViewGraphProductionOptions,
  consumerCandidate: Parameters<typeof compileQuireLayoutViewGraphConsumers>[0]
): QuireLayoutViewGraphProductionResult {
  const validation = validateQuireViewGraphSnapshot(graph);

  if (validation.valid) {
    return {
      graph,
      consumerCompilation: compileQuireLayoutViewGraphConsumers(
        consumerCandidate,
        options
      ),
      gaps: []
    };
  }

  return {
    graph: null,
    consumerCompilation: {
      kind: "unavailable",
      gaps: validation.issues.map((issue) => ({
        code: issue.code === "invalid-query-budget"
          ? "invalid-query-budget" as const
          : "invalid-view-graph" as const,
        message: issue.message
      }))
    },
    gaps: validation.issues.map((issue) => ({
      code: "invalid-view-graph",
      message: issue.message,
      validationIssue: issue
    }))
  };
}
