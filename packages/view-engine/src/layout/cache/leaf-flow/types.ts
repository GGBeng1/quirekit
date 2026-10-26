import type { QuireBlockFlowCacheAdapter } from "@quirekit/layout/block-flow";
import type { QuireBlockLayoutInput } from "../../engine/block-types";
import type { QuireLayoutBox } from "../../engine/types";

/** Work counters for exact recursive leaf placement reuse. */
export interface QuireLeafFlowCacheCounters {
  /** Exact input and geometry matches that skipped leaf placement. */
  readonly hits: number;
  /** Relocated inputs served by shifting their source placement. */
  readonly relocations: number;
  /** Eligible lookups without an exact retained placement. */
  readonly misses: number;
  /** Successfully completed eligible placements retained by weak input identity. */
  readonly stores: number;
  /** Lookups rejected because the input owns unsupported or snapshot-bound data. */
  readonly bypasses: number;
}

/** View-owned adapter for immutable ordinary leaf placement results. */
export interface QuireLeafFlowCache
  extends QuireBlockFlowCacheAdapter<QuireBlockLayoutInput, QuireLayoutBox> {
  /**
   * Reads cumulative work counters without affecting cached placements.
   *
   * @returns Exact placement reuse and admission counters.
   */
  snapshot(): QuireLeafFlowCacheCounters;
}
