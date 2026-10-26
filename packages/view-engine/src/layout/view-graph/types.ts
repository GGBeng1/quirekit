import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireLayoutRegion,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireViewConsumerCompilation,
  QuireViewConsumerCompilationGap,
  QuireViewSharedConsumerDescriptor,
  QuireViewGraphPerformanceContract,
  QuireViewGraphSnapshot,
  QuireViewGraphValidationIssue
} from "../../view-graph";
import type {
  QuireLayoutNode,
  QuireLayoutProductSnapshotDraft
} from "../types";
import type { QuireRetainedRegionProducts } from "../region-products";

/** Production gap code reported while creating the layout view graph. */
export type QuireLayoutViewGraphProductionGapCode =
  | "missing-view-root"
  | "missing-view-region"
  | "missing-view-source"
  | "missing-view-capabilities"
  | "conflicting-view-region"
  | "invalid-view-graph";

/** One missing product found while creating the layout view graph. */
export interface QuireLayoutViewGraphProductionGap {
  /** Stable machine-readable gap code. */
  readonly code: QuireLayoutViewGraphProductionGapCode;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Optional layout node id involved in the gap. */
  readonly nodeId?: string | undefined;
  /** Optional document range represented by the layout node. */
  readonly range?: QuireDocumentRange | undefined;
  /** Optional validation issue when the candidate graph violates canonical invariants. */
  readonly validationIssue?: QuireViewGraphValidationIssue | undefined;
}

/** Options for creating a retained view graph from a layout snapshot. */
export interface QuireLayoutViewGraphProductionOptions {
  /** Layout snapshot to inspect. */
  readonly snapshot: QuireLayoutProductSnapshotDraft;
  /** Exact retained products compiled by document and layout producers. */
  readonly regionProducts: QuireRetainedRegionProducts;
  /** Version assigned to the produced view graph. */
  readonly version: number;
  /** Performance contract assigned to the graph produced from the snapshot. */
  readonly performance: QuireViewGraphPerformanceContract;
}

/** Result of creating layout products for the retained view graph contract. */
export interface QuireLayoutViewGraphProductionResult {
  /** Canonical graph when every required product is present and valid. */
  readonly graph: QuireViewGraphSnapshot | null;
  /** Required shared-consumer compilation produced with the retained graph. */
  readonly consumerCompilation: QuireViewConsumerCompilation;
  /** Production gaps that prevented canonical graph creation. */
  readonly gaps: readonly QuireLayoutViewGraphProductionGap[];
}

/** Incremental descriptor state assembled during retained graph production. */
export interface QuireLayoutViewGraphConsumerCandidate {
  /** Descriptors compiled as exact regions enter the graph candidate. */
  readonly descriptorsByOwner:
    Readonly<Record<string, QuireViewSharedConsumerDescriptor>>;
  /** Exact owner keys retained in graph production order. */
  readonly ownerKeys: readonly string[];
  /** Descriptor authority gaps that reject the complete consumer view. */
  readonly gaps: readonly QuireViewConsumerCompilationGap[];
  /** Number of exact region candidates considered during graph production. */
  readonly candidateCount: number;
}

/** Mutable state used while one exact region enters graph production. */
export interface AppendQuireLayoutViewGraphRegionCandidateOptions {
  /** Exact retained region to append. */
  readonly region: QuireLayoutRegion;
  /** Compiled roots keyed by stable id. */
  readonly rootsById: ReadonlyMap<string, QuireLayoutRoot>;
  /** Mutable graph region list. */
  readonly regions: QuireLayoutRegion[];
  /** Mutable exact-region deduplication map. */
  readonly regionsByKey: Map<string, QuireLayoutRegion>;
  /** Mutable exact-owner descriptor record. */
  readonly descriptorsByOwner: Record<string, QuireViewSharedConsumerDescriptor>;
  /** Mutable descriptor owner keys in graph production order. */
  readonly descriptorOwnerKeys: string[];
  /** Mutable consumer authority gaps. */
  readonly consumerGaps: QuireViewConsumerCompilationGap[];
}

/** Internal layout node entry used by retained graph production. */
export interface QuireLayoutViewGraphNodeEntry {
  /** Layout node being inspected. */
  readonly node: QuireLayoutNode;
  /** Depth of the node in the layout tree. */
  readonly depth: number;
}
