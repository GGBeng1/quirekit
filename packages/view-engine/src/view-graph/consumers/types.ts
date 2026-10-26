import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutExportFallback,
  QuireLayoutRegionKind,
  QuireLayoutRegionRef,
  QuireLayoutRoot,
  QuireLayoutSemanticDescriptor,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireViewCoordinateSpaceKind
} from "../types";

/** Stable retained owner shared by semantic and transfer consumers. */
export interface QuireViewSharedConsumerOwner {
  /** Retained root that owns the descriptor. */
  readonly root: QuireLayoutRoot;
  /** Exact retained region occurrence represented by the descriptor. */
  readonly region: QuireLayoutRegionRef;
  /** Explicit source identity represented by the region. */
  readonly source: QuireLayoutSourceRef;
}

/** Renderer-neutral descriptor compiled with one retained region. */
export interface QuireViewSharedConsumerDescriptor {
  /** Stable root, region, visual-instance, and source ownership. */
  readonly owner: QuireViewSharedConsumerOwner;
  /** Semantic kind declared by the retained region. */
  readonly kind: QuireLayoutRegionKind;
  /** Capabilities that determine which internal consumers may use the descriptor. */
  readonly capabilities: QuireLayoutCapabilitySet;
  /** Explicit semantic facts shared by accessibility, search, and export consumers. */
  readonly semantics?: QuireLayoutSemanticDescriptor | undefined;
  /** Authoritative retained geometry for the region occurrence. */
  readonly rect: QuireRect;
  /** Coordinate space that owns the retained rectangle. */
  readonly coordinateSpace: QuireViewCoordinateSpaceKind;
  /** Explicit generic export fallbacks declared by this exact occurrence. */
  readonly exportFallbacks: readonly QuireLayoutExportFallback[];
}

/** Stable consumer-compilation gap classification. */
export type QuireViewConsumerCompilationGapCode =
  | "invalid-query-budget"
  | "query-budget-exceeded"
  | "missing-consumer-query-index"
  | "invalid-view-graph"
  | "missing-root"
  | "missing-source"
  | "missing-source-range"
  | "missing-region-rect"
  | "missing-coordinate-space"
  | "missing-consumer-semantics"
  | "consumer-not-accessible";

/** Explicit gap that makes the complete consumer view unavailable. */
export interface QuireViewConsumerCompilationGap {
  /** Stable machine-readable gap code. */
  readonly code: QuireViewConsumerCompilationGapCode;
  /** Human-readable diagnostic explanation. */
  readonly message: string;
  /** Exact region involved in a descriptor gap, when known. */
  readonly region?: QuireLayoutRegionRef | undefined;
  /** Candidate count rejected by a scan budget, when applicable. */
  readonly candidateCount?: number | undefined;
  /** Declared scan cap exceeded by the candidates, when applicable. */
  readonly maxScannedItems?: number | undefined;
}

/** Complete consumer view compiled for one retained snapshot. */
export interface QuireViewConsumerCompilationReady {
  /** Available compilation discriminator. */
  readonly kind: "ready";
  /** Single-region descriptors keyed by exact root/region/visual occurrence. */
  readonly descriptorsByOwner:
    Readonly<Record<string, QuireViewSharedConsumerDescriptor>>;
  /** Exact owner keys reachable through the retained viewport/page query index. */
  readonly indexedOwnerKeys: readonly string[];
}

/** Consumer view rejected as a whole because authority or budget was incomplete. */
export interface QuireViewConsumerCompilationUnavailable {
  /** Unavailable compilation discriminator. */
  readonly kind: "unavailable";
  /** Gaps that prevent any partial descriptor view from being consumed. */
  readonly gaps: readonly QuireViewConsumerCompilationGap[];
}

/** Required discriminated consumer compilation attached to retained snapshots. */
export type QuireViewConsumerCompilation =
  | QuireViewConsumerCompilationReady
  | QuireViewConsumerCompilationUnavailable;

/** Result of compiling one exact retained region descriptor. */
export type QuireViewConsumerDescriptorCompilation =
  | {
      /** Complete descriptor discriminator. */
      readonly kind: "ready";
      /** Descriptor compiled from one exact retained region. */
      readonly descriptor: QuireViewSharedConsumerDescriptor;
    }
  | {
      /** Rejected descriptor discriminator. */
      readonly kind: "unavailable";
      /** Exact missing fact that rejected the descriptor. */
      readonly gap: QuireViewConsumerCompilationGap;
    };

/** Exact retained owner address used by internal descriptor queries. */
export interface QuireViewConsumerOwnerAddress {
  /** Stable retained root id. */
  readonly rootId: string;
  /** Stable retained region id inside the root. */
  readonly regionId: string;
  /** Exact repeated visual occurrence, when present. */
  readonly visualInstanceId?: string | undefined;
}

/** Result of querying one exact retained consumer owner. */
export type QuireViewConsumerOwnerQueryResult =
  | {
      /** Exact descriptor hit discriminator. */
      readonly kind: "ready";
      /** Descriptor owned by the requested exact address. */
      readonly descriptor: QuireViewSharedConsumerDescriptor;
    }
  | {
      /** Unavailable or absent descriptor discriminator. */
      readonly kind: "unavailable";
      /** Gaps that prevented an exact descriptor result. */
      readonly gaps: readonly QuireViewConsumerCompilationGap[];
    };
