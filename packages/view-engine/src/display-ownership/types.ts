import type {
  QuireDisplayCommand,
  QuireDisplayList,
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutDirtyRange,
  QuireViewInvalidationCause,
  QuireViewUpdatePatch
} from "../invalidation";
import type { QuireDisplayOwnerPaintScope } from "../display-list";
import type { QuireLayoutPage } from "../layout";
import type { QuireLayoutSnapshot } from "../editor-layout";
import type { QuireDecorationLanes } from "../decorations";
import type { QuireSelectionGeometry } from "../interaction";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";

/** Paint lane owned independently by one retained display record. */
export type QuireRetainedDisplayOwnerLane = "content" | "overlay";

/** Concrete retained layout product that owns a display record. */
export type QuireRetainedDisplayOwnerKind =
  | "layout-node"
  | "sub-layout"
  | "page-chrome"
  | "layer-contribution"
  | "selection"
  | "annotation";

/** Exact paint responsibility owned by one retained display record. */
export type QuireRetainedDisplayPaintScope = QuireDisplayOwnerPaintScope;

/** Explicit gap that prevents a bounded display-owner projection. */
export interface QuireRetainedDisplayOwnerGap {
  /** Stable machine-readable reason for rejecting bounded ownership. */
  readonly code:
    | "layout-owner-missing"
    | "sub-layout-owner-missing"
    | "page-owner-missing"
    | "selection-owner-missing"
    | "annotation-owner-missing"
    | "visual-instance-missing";
  /** Layout product whose required identity facts were incomplete. */
  readonly productId: string;
  /** Human-readable diagnostic for developer tooling. */
  readonly message: string;
}

/** One direct paint owner compiled from explicit retained layout facts. */
export interface QuireRetainedDisplayOwner {
  /** Stable key derived from root, region, source, visual instance, and product. */
  readonly key: string;
  /** Retained product category represented by this owner. */
  readonly kind: QuireRetainedDisplayOwnerKind;
  /** Stable layout or page product that produced this owner. */
  readonly productId: string;
  /** Exact paint responsibility included in stable owner identity. */
  readonly paintScope: QuireRetainedDisplayPaintScope;
  /** Explicit view region, including visual-instance identity when repeated. */
  readonly region: QuireLayoutRegionRef;
  /** Exact region-owned source identity. */
  readonly source: QuireLayoutSourceRef;
  /** Explicit capability facts participating in the owner identity. */
  readonly capabilities: QuireLayoutCapabilitySet;
  /** Document range represented by this owner. */
  readonly range: QuireDocumentRange;
  /** Document-space bounds owned by this display record. */
  readonly rect: QuireRect;
  /** Pages whose frame rectangles intersect this owner. */
  readonly pageIndexes: readonly number[];
  /** Nearest-to-farthest retained content ancestors requiring coordinated rebuild. */
  readonly ancestorOwnerKeys: readonly string[];
  /** Lanes that this owner can realize without a backend-local fallback. */
  readonly lanes: readonly QuireRetainedDisplayOwnerLane[];
  /** Optional dependency signature forwarded by a retained sub-layout product. */
  readonly dependencySignature?: string | undefined;
}

/** Indexed owner graph compiled for one immutable layout snapshot. */
export interface QuireRetainedDisplayOwnerIndex {
  /** Owners in deterministic layout/source order. */
  readonly owners: readonly QuireRetainedDisplayOwner[];
  /** Owners keyed by stable owner key for O(1) projection lookup. */
  readonly ownersByKey: Readonly<Record<string, QuireRetainedDisplayOwner>>;
  /** Owners indexed by page membership for page-stack realization. */
  readonly ownerKeysByPageIndex: Readonly<Record<number, readonly string[]>>;
  /** Explicit ownership gaps rejected during compilation. */
  readonly gaps: readonly QuireRetainedDisplayOwnerGap[];
}

/** Commands directly compiled for one retained display owner. */
export interface QuireRetainedDisplayOwnerChunk {
  /** Explicit retained owner that owns these commands. */
  readonly owner: QuireRetainedDisplayOwner;
  /** Persistent content commands emitted directly for this owner. */
  readonly contentDisplayList: QuireDisplayList;
  /** Transient overlay commands emitted directly for this owner. */
  readonly overlayDisplayList: QuireDisplayList;
  /** Producer batches preserving canonical paint order across owners. */
  readonly segments: readonly QuireRetainedDisplayOwnerCommandSegment[];
}

/** One directly produced command segment inside a retained owner chunk. */
export interface QuireRetainedDisplayOwnerCommandSegment {
  /** Content or overlay lane receiving this segment. */
  readonly lane: QuireRetainedDisplayOwnerLane;
  /** Producer-declared order within the lane. */
  readonly paintOrder: number;
  /** Stable append sequence used only to break equal-order ties. */
  readonly sequence: number;
  /** Ordered commands emitted by the producer batch. */
  readonly commands: readonly QuireDisplayCommand[];
}

/** Sparse index of direct command chunks keyed by retained owner. */
export interface QuireRetainedDisplayOwnerChunkIndex {
  /** Owner chunks in deterministic layout order. */
  readonly chunks: readonly QuireRetainedDisplayOwnerChunk[];
  /** Owner chunks keyed by stable retained display-owner identity. */
  readonly chunksByOwnerKey: Readonly<Record<string, QuireRetainedDisplayOwnerChunk>>;
}

/** Direct sink used while display-list command builders emit owner commands. */
export interface QuireRetainedDisplayOwnerChunkCollector {
  /**
   * Receives commands emitted by one exact retained paint responsibility.
   *
   * @param batch - Explicit product, paint scope, and ordered commands.
   * @returns Nothing.
   */
  readonly append: (batch: {
    /** Stable product identity supplied by the command producer. */
    readonly productId: string;
    /** Exact paint responsibility supplied by the command producer. */
    readonly paintScope: QuireRetainedDisplayPaintScope;
    /** Producer-declared order within the target paint lane. */
    readonly paintOrder: number;
    /** Ordered commands emitted for this owner responsibility. */
    readonly commands: readonly QuireDisplayCommand[];
  }) => void;
  /**
   * Finalizes direct content lists using document bounds for empty owners.
   *
   * @param bounds - Document-space bounds shared by all owner display lists.
   * @returns Sparse direct owner chunk index.
   */
  readonly finish: (bounds: QuireRect) => QuireRetainedDisplayOwnerChunkIndex;
}

/** One retained owner selected by a typed invalidation projection. */
export interface QuireDisplayInvalidatedOwner {
  /** Stable owner key selected for this update. */
  readonly ownerKey: string;
  /** Paint lanes requiring refresh for this owner. */
  readonly lanes: readonly QuireRetainedDisplayOwnerLane[];
}

/** Explicit reason a bounded invalidation projection widened or stopped. */
export interface QuireDisplayInvalidationProjectionEscalation {
  /** Stable machine-readable escalation code. */
  readonly code:
    | "missing-update-patch"
    | "missing-dirty-range"
    | "dirty-range-owner-miss"
    | "invalidation-identity-gap"
    | "owner-identity-gap"
    | "broad-invalidation";
  /** Human-readable reason exposed to diagnostics. */
  readonly message: string;
}

/** Shared invalidation answer consumed by Canvas, SVG, and HTML realization. */
export interface QuireDisplayInvalidationProjection {
  /** Typed update patch that was projected, when one was supplied. */
  readonly updatePatch?: QuireViewUpdatePatch | null | undefined;
  /** Owners selected in deterministic source order. */
  readonly owners: readonly QuireDisplayInvalidatedOwner[];
  /** Ordered causes copied from the update patch for diagnostics. */
  readonly causes: readonly QuireViewInvalidationCause[];
  /** Whether mounted page/viewport membership must be resynchronized. */
  readonly refreshViewportMembership: boolean;
  /** Explicit conservative escalations taken by the projection. */
  readonly escalations: readonly QuireDisplayInvalidationProjectionEscalation[];
}

/** Diagnostics describing one retained owner compilation and realization pass. */
export interface QuireRetainedDisplayOwnerDiagnostics {
  /** Number of exact owners compiled for the render result. */
  readonly compiledOwners: number;
  /** Number of compiled owners capable of producing content. */
  readonly contentOwners: number;
  /** Number of compiled owners capable of producing overlays. */
  readonly overlayOwners: number;
  /** Number of direct owner chunks realized for the render result. */
  readonly directOwnerChunks: number;
  /** Owners selected for rebuild by typed invalidation. */
  readonly rebuiltOwners: number;
  /** Owners retained outside the typed invalidation projection. */
  readonly reusedOwners: number;
  /** Number of projected content lanes. */
  readonly projectedContentLanes: number;
  /** Number of projected overlay lanes. */
  readonly projectedOverlayLanes: number;
  /** Typed owner-compilation gap codes in deterministic order. */
  readonly gapCodes: readonly QuireRetainedDisplayOwnerGap["code"][];
  /** Named invalidation escalation codes in deterministic order. */
  readonly escalationCodes: readonly QuireDisplayInvalidationProjectionEscalation["code"][];
  /** Number of command-observer bridges used by this render. */
  readonly observerBridgeUses: number;
}

/** Inputs used to compile direct display owners from one layout snapshot. */
export interface CreateQuireRetainedDisplayOwnerIndexOptions {
  /** Immutable layout snapshot containing explicit owner facts. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Concrete pages used only to index owner realization membership. */
  readonly realizationPages?: readonly QuireLayoutPage[] | undefined;
  /** Optional selection geometry compiled into one root-owned overlay product. */
  readonly selectionGeometry?: QuireSelectionGeometry | undefined;
  /** Optional decoration lanes compiled into source-owned annotation products. */
  readonly decorationLane?: QuireDecorationLanes | undefined;
}

/** Inputs used to project one typed update onto retained display owners. */
export interface CreateQuireDisplayInvalidationProjectionOptions {
  /** Retained owner index compiled for the current layout snapshot. */
  readonly ownerIndex: QuireRetainedDisplayOwnerIndex;
  /** Typed mounted-view update being projected, when available. */
  readonly updatePatch?: QuireViewUpdatePatch | null | undefined;
  /** Canonical dirty range supplied separately by a render request, when available. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
}
