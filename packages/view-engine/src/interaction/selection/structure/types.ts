import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireSelectionAdapterModes
} from "../../../selection-adapter";

/** Immutable semantic unit compiled from one adapter-owned source node. */
export interface QuireSelectionStructureUnitFact {
  /** Stable id unique within the owning source node. */
  readonly id: string;
  /** Adapter-defined semantic kind. */
  readonly kind: string;
  /** Absolute half-open document range owned by this unit. */
  readonly range: QuireDocumentRange;
}

/** Immutable source owner compiled for structured range planning. */
export interface QuireSelectionStructureOwnerFact {
  /** Snapshot-stable owner identity derived from adapter and source position. */
  readonly ownerId: string;
  /** Stable selection adapter id. */
  readonly adapterId: string;
  /** Extension that contributed the adapter. */
  readonly extensionName: string;
  /** ProseMirror node type represented by this owner. */
  readonly nodeType: string;
  /** Absolute half-open document range occupied by the source node. */
  readonly range: QuireDocumentRange;
  /** Crossing decisions copied from the validated adapter. */
  readonly modes: QuireSelectionAdapterModes;
  /** Stable command domain for structural mutations. */
  readonly commandDomain: string;
  /** Stable clipboard domain for structural serialization. */
  readonly clipboardDomain: string;
  /** Mapping fallback used when one or more units disappear. */
  readonly mappingFallback: "nearest" | "text" | "remove";
  /** Replacement fallback used when generic replacement is unavailable. */
  readonly replacementFallback: "owner" | "text" | "reject";
  /** Ordered semantic units compiled from the source node. */
  readonly units: readonly QuireSelectionStructureUnitFact[];
}

/** Source-ordered interval index queried by the structured range planner. */
export interface QuireSelectionStructureIntervalIndex {
  /** Adapter-owned source nodes in deterministic outer-before-inner order. */
  readonly entries: readonly QuireSelectionStructureOwnerFact[];
  /** Number of indexed adapter-owned source nodes. */
  readonly entryCount: number;
  /**
   * Returns owners whose half-open ranges intersect the requested range.
   *
   * @param range - Expanded half-open source range to query.
   * @returns Intersecting owners in deterministic source order.
   */
  readonly query: (
    range: QuireDocumentRange
  ) => readonly QuireSelectionStructureOwnerFact[];
}

/** Inputs used to compile one snapshot-owned structure interval index. */
export interface QuireSelectionStructureIntervalIndexOptions {
  /** ProseMirror document traversed once for adapter-owned source nodes. */
  readonly doc: import("@quirekit/pm").Node;
  /** Optional Core manager carrying installed adapter registrations. */
  readonly extensionManager?: Pick<
    import("@quirekit/core").QuireExtensionManager,
    "selectionAdapters" | "selectionAdapterRegistry"
  > | undefined;
}
