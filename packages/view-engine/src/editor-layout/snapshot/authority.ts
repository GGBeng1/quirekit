import {
  quireViewGraphRequiredInvalidationScopeKinds,
  quireViewGraphRequiredPerformanceInvariants
} from "../../view-graph";
import type { QuireLayoutSnapshotViewGraphOptions } from "../../layout/types";

let nextSnapshotVersion = 1;

/**
 * Allocates the retained authority facts for one production layout snapshot.
 *
 * The layout package owns these facts because it owns the viewport index,
 * retained invalidation scopes, and snapshot lifecycle promised by the graph.
 * Backends and extension adapters must not provide substitute contracts.
 *
 * @returns Monotonic graph version and the layout-owned performance contract.
 */
export function allocateQuireLayoutSnapshotViewGraphOptions(): QuireLayoutSnapshotViewGraphOptions {
  const version = nextSnapshotVersion;

  nextSnapshotVersion += 1;

  return {
    version,
    performance: {
      invariants: quireViewGraphRequiredPerformanceInvariants,
      invalidationScopes: quireViewGraphRequiredInvalidationScopeKinds.map(
        (kind) => ({ kind })
      ),
      queryBudget: {
        kind: "viewport-indexed",
        label: "layout snapshot interaction indexes"
      }
    }
  };
}
