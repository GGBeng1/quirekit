import {
  quireViewGraphRequiredInvalidationScopeKinds,
  quireViewGraphRequiredPerformanceInvariants
} from "../../src/view-graph";
import type { QuireLayoutSnapshot, QuireRetainedLayoutSnapshot } from "../../src/editor-layout";

/**
 * Promotes an isolated layout shape to a retained snapshot for unit tests.
 *
 * This helper is intentionally test-only. Production code must use the layout
 * snapshot authority so graph versions remain monotonic and products are
 * validated from real layout annotations.
 *
 * @param snapshot - Detached layout shape used by a focused unit test.
 * @returns Retained test snapshot with an explicit empty graph.
 */
export function retainQuireLayoutSnapshotForTest(
  snapshot: QuireLayoutSnapshot
): QuireRetainedLayoutSnapshot {
  return {
    ...snapshot,
    viewGraph: {
      version: 0,
      performance: {
        invariants: quireViewGraphRequiredPerformanceInvariants,
        invalidationScopes: quireViewGraphRequiredInvalidationScopeKinds.map(
          (kind) => ({ kind })
        ),
        queryBudget: {
          kind: "viewport-indexed",
          label: "isolated retained snapshot test fixture"
        }
      },
      roots: [],
      regions: []
    },
    consumerCompilation: {
      kind: "unavailable",
      gaps: [{
        code: "missing-consumer-query-index",
        message: "Isolated retained snapshot fixtures do not compile consumer queries."
      }]
    }
  };
}
