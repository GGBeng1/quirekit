import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireSelectionStructureIntervalIndex,
  QuireSelectionStructureUnitFact
} from "../structure";

/** Logical direction retained independently from source-ordered segments. */
export type QuireStructuredRangeDirection = "forward" | "backward";

/** Ordinary document text retained by a normalized range. */
export interface QuireStructuredRangeTextSegment {
  /** Segment discriminator. */
  readonly kind: "text";
  /** Absolute half-open selected text range. */
  readonly range: QuireDocumentRange;
}

/** Adapter-owned semantic structure retained by a normalized range. */
export interface QuireStructuredRangeStructureSegment {
  /** Segment discriminator. */
  readonly kind: "structure";
  /** Snapshot-stable owner identity. */
  readonly ownerId: string;
  /** Adapter that normalized this source owner. */
  readonly adapterId: string;
  /** ProseMirror node type represented by the owner. */
  readonly nodeType: string;
  /** Absolute half-open range of the complete adapter-owned source node. */
  readonly ownerRange: QuireDocumentRange;
  /** Absolute half-open semantic selection range. */
  readonly range: QuireDocumentRange;
  /** Selected semantic units, or an empty list for whole-owner selection. */
  readonly units: readonly QuireSelectionStructureUnitFact[];
  /** Stable command domain for structural mutations. */
  readonly commandDomain: string;
  /** Stable clipboard domain for structural serialization. */
  readonly clipboardDomain: string;
  /** Safe fallback when mapped semantic units disappear. */
  readonly mappingFallback: "nearest" | "text" | "remove";
  /** Safe fallback when generic replacement cannot preserve the owner. */
  readonly replacementFallback: "owner" | "text" | "reject";
}

/** One source-ordered segment in a normalized structured range. */
export type QuireStructuredRangeSegment =
  | QuireStructuredRangeTextSegment
  | QuireStructuredRangeStructureSegment;

/** Renderer-neutral plan produced from one logical drag range. */
export interface QuireStructuredRangePlan {
  /** Fixed logical drag endpoint. */
  readonly anchor: number;
  /** Moving logical drag endpoint. */
  readonly head: number;
  /** Logical gesture direction independent from segment order. */
  readonly direction: QuireStructuredRangeDirection;
  /** Whether the result cannot remain one ordinary text selection. */
  readonly requiresStructuredSelection: boolean;
  /** Selected text and structure segments in ascending source order. */
  readonly segments: readonly QuireStructuredRangeSegment[];
}

/** JSON payload persisted through ProseMirror's selection registry. */
export interface QuireStructuredRangeSelectionJSON {
  /** Registered ProseMirror selection type id. */
  readonly type: string;
  /** Fixed logical drag endpoint. */
  readonly anchor: number;
  /** Moving logical drag endpoint. */
  readonly head: number;
  /** Logical gesture direction independent from segment order. */
  readonly direction: QuireStructuredRangeDirection;
  /** Selected text and structure segments in ascending source order. */
  readonly segments: readonly QuireStructuredRangeSegment[];
}

/** Inputs consumed by the pure structured-range planner. */
export interface QuireStructuredRangePlannerOptions {
  /** Fixed logical drag endpoint in document coordinates. */
  readonly anchor: number;
  /** Moving logical drag endpoint in document coordinates. */
  readonly head: number;
  /** Snapshot-owned source structure index. */
  readonly structureIndex: QuireSelectionStructureIntervalIndex;
}
