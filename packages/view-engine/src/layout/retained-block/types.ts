import type { QuireLeafFlowCache, QuireLeafFlowCacheCounters } from "../cache/leaf-flow";
import type { QuireLayoutDirtyRange } from "../../invalidation";
import type { QuireBlockLayoutInput } from "../engine/block-types";
import type { QuireLayoutBox } from "../engine/types";
import type { QuireTableLayoutSnapshot } from "../engine/table";
import type { QuireTableProductCache } from "../cache/table";
import type {
  QuireLayoutProviderExecutionLifecycle,
  QuireLayoutProviderExecutionLifecycleCounters
} from "../providers/lifecycle";

/** Complete document placement that produced one immutable local block. */
export interface QuireRetainedBlockOriginalPlacement {
  /** Full layout including provider-owned geometry and sidecars. */
  readonly box: QuireLayoutBox;
  /** Document X origin supplied to the original block builder. */
  readonly x: number;
  /** Document Y origin supplied to the original block builder. */
  readonly y: number;
}

/** Resource epochs that participate in retained block dependency validation. */
export interface QuireRetainedBlockDependencyEpochs {
  /** Epoch for resolved font metrics. */
  readonly font: number;
  /** Epoch for intrinsic image measurements. */
  readonly image: number;
  /** Epoch for the selected line-breaking implementation. */
  readonly lineBreaker: number;
  /** Epoch for layout-affecting decorations. */
  readonly decoration: number;
}

/** Scheduler priority assigned while reconciling one retained block record. */
export type QuireRetainedBlockDirtyPriority =
  | "clean"
  | "local-content"
  | "local-structure"
  | "global";

/** One renderer-neutral block record retained in local coordinates. */
export interface QuireRetainedBlockLayoutRecord {
  /** Stable top-level block identity. */
  readonly id: string;
  /** Input that most recently validated the record. */
  readonly input: QuireBlockLayoutInput;
  /** Position-independent signature of local layout dependencies. */
  readonly dependencySignature: string;
  /** Local layout box whose origin is zero. */
  readonly localBox: QuireLayoutBox;
  /** Intrinsic block height before sibling spacing is applied. */
  readonly intrinsicHeight: number;
  /** Optional retained table snapshot owned by the local box. */
  readonly tableSnapshot?: QuireTableLayoutSnapshot | undefined;
  /** Dirty priority used by the commit that produced this record. */
  readonly dirtyPriority: QuireRetainedBlockDirtyPriority;
}

/** Cumulative diagnostics for one retained block graph. */
export interface QuireRetainedBlockLayoutGraphCounters {
  /** Number of atomic graph commits. */
  readonly commits: number;
  /** Number of current inputs inspected across commits. */
  readonly reconciledRecords: number;
  /** Number of local block records rebuilt across commits. */
  readonly rebuiltRecords: number;
  /** Number of local block records reused across commits. */
  readonly reusedRecords: number;
  /** Number of records projected into current document flow. */
  readonly projectedRecords: number;
  /** Number of stale records removed across commits. */
  readonly removedRecords: number;
  /** Number of structural height-index rebuilds. */
  readonly heightIndexRebuilds: number;
  /** Number of same-order height-index delta batches. */
  readonly heightIndexDeltaBatches: number;
  /** Number of extents changed through height-index delta batches. */
  readonly heightIndexUpdatedEntries: number;
  /** Number of indexed block-top queries used for projection. */
  readonly heightIndexQueries: number;
  /** Number of successful debug full-flow comparisons. */
  readonly debugFlowComparisons: number;
  /** Provider execution lifecycle owned by this retained graph. */
  readonly providerExecution: QuireLayoutProviderExecutionLifecycleCounters;
  /** Recursive leaf placement reuse owned by this retained graph. */
  readonly leafFlow?: QuireLeafFlowCacheCounters | undefined;
}

/** Inputs required to reconcile and project one top-level block flow. */
export interface QuireRetainedBlockReconcileOptions {
  /** Current top-level block inputs in document order. */
  readonly children: readonly QuireBlockLayoutInput[];
  /** Absolute horizontal origin of the containing flow. */
  readonly x: number;
  /** Absolute vertical origin of the containing flow. */
  readonly y: number;
  /** Available inline size for every top-level block. */
  readonly width: number;
  /** Default minimum block height. */
  readonly blockHeight: number;
  /** Gap inserted between sibling blocks. */
  readonly blockGap: number;
  /** Optional bounded fragment size supplied to structured layouts. */
  readonly fragmentBlockSize?: number | undefined;
  /** Canonical dirty range for the current update. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
  /** Current resource dependency epochs. */
  readonly dependencyEpochs: QuireRetainedBlockDependencyEpochs;
  /** Builds one block at the supplied flow origin and returns local geometry. */
  readonly buildLocalBlock: (
    input: QuireBlockLayoutInput,
    origin: { readonly x: number; readonly y: number }
  ) => QuireLayoutBox;
}

/** Atomic output of one retained block graph reconciliation. */
export interface QuireRetainedBlockLayoutCommit {
  /** Current block records in document order. */
  readonly records: readonly QuireRetainedBlockLayoutRecord[];
  /** Projected layout boxes in document order. */
  readonly children: readonly QuireLayoutBox[];
  /** Total flow height after spacing and gaps. */
  readonly height: number;
}

/** Internal retained block graph consumed by the layout engine. */
export interface QuireRetainedBlockLayoutGraph {
  /** Exact ordinary leaf placements retained only by this accepted or transient graph. */
  readonly leafFlowCache: QuireLeafFlowCache;
  /** Renderer-neutral table products retained for this view lifecycle. */
  readonly tableProductCache: QuireTableProductCache;
  /** Provider execution epochs and continuation retained for this view lifecycle. */
  readonly providerExecutionLifecycle: QuireLayoutProviderExecutionLifecycle;

  /**
   * Reconciles current inputs and projects one atomic flow commit.
   *
   * @param options - Current inputs, geometry, invalidation, and local builder.
   * @returns Retained records and projected layout boxes.
   */
  reconcile(options: QuireRetainedBlockReconcileOptions): QuireRetainedBlockLayoutCommit;

  /**
   * Reads cumulative graph diagnostics.
   *
   * @returns Current retained graph counters.
   */
  snapshot(): QuireRetainedBlockLayoutGraphCounters;

  /**
   * Maps an absolute document Y to a top-level block candidate.
   *
   * @param y - Absolute document-space vertical coordinate.
   * @returns Current block index, or undefined outside the retained flow.
   */
  blockIndexAtY(y: number): number | undefined;

  /**
   * Inspects one internal record for diagnostics and identity tests.
   *
   * @param id - Stable retained block id.
   * @returns Current record, or undefined when absent.
   */
  inspectRecord(id: string): QuireRetainedBlockLayoutRecord | undefined;
}

/** Internal construction options for one retained block graph. */
export interface QuireRetainedBlockLayoutGraphOptions {
  /** Whether every commit compares indexed flow with a linear baseline. */
  readonly debugCompareFullFlow?: boolean | undefined;
}
