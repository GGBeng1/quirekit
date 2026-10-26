import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireAffineTransform, QuireRect } from "@quirekit/renderer";
import type { QuireViewTarget } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutExportFallback,
  QuireLayoutRegionRef,
  QuireLayoutRoot,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireViewConsumerCompilation,
  QuireViewGraphPerformanceContract,
  QuireViewGraphSnapshot,
  QuireViewLayerTargetIndex
} from "../view-graph";
import type { QuireInlinePlacementGap } from "./engine/inline/placement-reference";
import type {
  QuireSubLayoutDisplayChunkReference,
  QuireSubLayoutQueryProducts
} from "./engine/sub-layout";
import type { QuireHitTarget } from "./engine/types";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type { QuireTableLayoutSnapshot } from "./engine/table";
import type { QuireParagraphDecoration } from "./engine/block-types";
import type {
  QuireRetainedRegionProductGap,
  QuireRetainedRegionProducts,
  QuireRetainedRegionSelectionPolicy,
  QuireRetainedLayerContribution
} from "./region-products";
import type {
  QuireSelectionStructureIntervalIndex
} from "../interaction/selection/structure";

/** Options used to attach a retained view graph to a layout snapshot. */
export interface QuireLayoutSnapshotViewGraphOptions {
  /** Version assigned to the retained view graph snapshot. */
  readonly version: number;
  /** Explicit performance contract promised by the graph producer. */
  readonly performance: QuireViewGraphPerformanceContract;
}

/** Options used to create retained hit targets from qkView targets. */
export interface CreateQuireViewTargetHitTargetsOptions {
  /** Stable id prefix used to avoid collisions with layout-produced targets. */
  readonly idPrefix: string;
  /** qkView targets emitted by retained decoration compilers. */
  readonly targets: readonly QuireViewTarget[];
  /** Fallback document range inherited from the owning layout product. */
  readonly fallbackRange?: QuireDocumentRange | undefined;
  /** Enclosing story owner that gates interaction without replacing the exact target owner. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Retained region inherited from the owning layout product. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Capabilities inherited from the owning layout product. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
  /** Explicit source identity inherited from the owning layout product. */
  readonly source?: QuireLayoutSourceRef | undefined;
}

/** Options used to create retained hit targets from mounted DOM overlays. */
export interface CreateQuireDomOverlayHitTargetsOptions {
  /** Stable id prefix used to avoid collisions with layout-produced targets. */
  readonly idPrefix: string;
  /** DOM overlays emitted by retained layout or decoration widgets. */
  readonly overlays: readonly QuireLayoutDomOverlay[];
  /** Retained region inherited from the owning layout product. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Exact region-owned source inherited from the owning layout product. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Capabilities inherited from the owning layout product. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
}

/** Transient IME preedit text inserted into speculative layout without committing. */
export interface QuireImePreedit {
  /** Document range that the preedit text visually represents. */
  readonly range: QuireDocumentRange;
  /** Preedit text to paint at render time. */
  readonly text: string;
}

/** Page box metadata carried from paginated layout into display-list generation. */
export interface QuireLayoutPage {
  /** Complete terminal-placement fact, including when this page is outside the viewport. */
  readonly terminalPlacement?: import("@quirekit/layout/pagination").QuireTerminalPlacement | undefined;
  /** Zero-based page index within the paginated document. */
  readonly pageIndex: number;
  /** Document range covered by this page fragment. */
  readonly range: QuireDocumentRange;
  /** Full page rectangle in canvas coordinate space. */
  readonly pageRect: QuireRect;
  /** Body/content rectangle in canvas coordinate space. */
  readonly bodyRect: QuireRect;
  /** Zero-width vertical separator lines between this page's non-empty columns. */
  readonly columnSeparators?: readonly QuireRect[] | undefined;
  /** Filled separator rules above this page's note areas. */
  readonly noteSeparators?: readonly QuireRect[] | undefined;
  /** Document ranges of the note parts shown on this page, so off-window notes still map to a page. */
  readonly noteRanges?: readonly QuireDocumentRange[] | undefined;
}

/** Kind of layout node represented in a canvas layout snapshot. */
export type QuireLayoutNodeKind = "block" | "inline";

/** DOM overlay descriptor with resolved canvas geometry and document range. */
export interface QuireLayoutDomOverlay {
  /** Stable overlay identifier within the layout snapshot. */
  readonly id: string;
  /** Optional reuse key for DOM-node overlays with stable identity. */
  readonly key?: string | undefined;
  /** Document range represented by the overlay. */
  readonly range: QuireDocumentRange;
  /** Resolved overlay rectangle in canvas coordinate space. */
  readonly rect: QuireRect;
  /** HTML content to mount in the overlay host. */
  readonly html?: string | undefined;
  /** Optional DOM node content for PM-compatible widget overlays. */
  readonly node?: unknown;
  /** Optional cleanup called when a mounted node overlay is replaced or removed. */
  readonly destroy?: ((node: unknown) => void) | undefined;
  /** Optional accessibility label for the overlay host. */
  readonly ariaLabel?: string;
  /** Optional semantic role applied by the mounted backend. */
  readonly role?: string;
  /** Whether the mounted overlay participates in browser pointer events. */
  readonly pointerEvents?: "auto" | "none";
}

/** Layout box derived from a document range. */
export interface QuireLayoutNode {
  /** Stable layout node identifier within a snapshot. */
  readonly id: string;
  /** Coarse layout role for the node. */
  readonly kind: QuireLayoutNodeKind;
  /** Document range represented by this layout node. */
  readonly range: QuireDocumentRange;
  /** Rectangle occupied by this layout node in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Opacity of the complete owned paint batch. */
  readonly paintOpacity?: number;
  /** Optional affine applied only while painting this node's direct content. */
  readonly paintTransform?: QuireAffineTransform | undefined;
  /** Optional axis-aligned bounds after applying `paintTransform`. */
  readonly paintBounds?: QuireRect | undefined;
  /** Outer hard paint boundary in final document coordinates, outside the node transform. */
  readonly paintClipRect?: QuireRect | undefined;
  /** Inline layout rectangle that preserves the original wrapping width for transient reflow. */
  readonly inlineLayoutRect?: QuireRect | undefined;
  /** Minimum resolved first/following-line width for insertion, in document CSS pixels. */
  readonly inlineContentWidth?: number | undefined;
  /** Optional paragraph background and border paint metadata. */
  readonly paragraphDecoration?: QuireParagraphDecoration | undefined;
  /** Interaction role used to suppress pointer queries while retaining optional paint. */
  readonly interactionRole?: "source-geometry" | "paint-only" | undefined;
  /** Optional retained view-graph root represented by this layout node. */
  readonly viewRoot?: QuireLayoutRoot | undefined;
  /** Optional retained view-graph region represented by this layout node. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Optional capability declarations represented by this layout node. */
  readonly viewCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Exact region-owned facts used by interaction consumers. */
  readonly layoutOwner?: QuireLayoutOwnerFacts | undefined;
  /** Optional export fallback declarations represented by this layout node. */
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  /** Optional capability-owned retained products represented by this layout node. */
  readonly regionProducts?: QuireRetainedRegionProducts | undefined;
  /** Measured text fragments owned by this layout node. */
  readonly textFragments?: readonly QuireTextFragment[];
  /** Logical inline source runs used by transient overlay reflow. */
  readonly textRuns?: readonly QuireInlineTextRun[];
  /** Optional table layout metadata owned by this layout node. */
  readonly table?: QuireTableLayoutSnapshot;
  /** Optional nested-flow query products adapted from retained sub-layout results. */
  readonly subLayoutQueryProducts?: QuireSubLayoutQueryProducts | undefined;
  /** Optional nested-flow display chunk references adapted from retained sub-layout results. */
  readonly subLayoutDisplayChunks?: readonly QuireSubLayoutDisplayChunkReference[] | undefined;
  /** Child layout nodes nested inside this layout node. */
  readonly children?: readonly QuireLayoutNode[];
}

/** One layout node address retained for interaction query indexing. */
export interface QuireLayoutInteractionQueryEntry {
  /** Snapshot-unique entry id. */
  readonly entryId: string;
  /** Stable layout node id represented by this entry. */
  readonly nodeId: string;
  /** Document range represented by the layout node. */
  readonly range: QuireDocumentRange;
  /** Layout node rectangle in document-space coordinates. */
  readonly rect: QuireRect;
  /** Zero-based preorder rank among indexed layout nodes. */
  readonly order: number;
  /** Nesting depth below the snapshot root children. */
  readonly depth: number;
  /** Child-index path from the snapshot root to the layout node. */
  readonly path: readonly number[];
}

/** Coarse page or viewport bucket for retained layout interaction queries. */
export interface QuireLayoutInteractionQueryIndexBucket {
  /** Stable bucket id within this layout snapshot. */
  readonly bucketId: string;
  /** Page index when this bucket represents a paginated page. */
  readonly pageIndex?: number | undefined;
  /** Bucket rectangle in document-space coordinates. */
  readonly rect: QuireRect;
  /** Indexes into `entries` that intersect this bucket rectangle. */
  readonly entryIndexes: readonly number[];
}

/** Retained layout-node query index used by hit, caret, and sub-layout mapping. */
export interface QuireLayoutInteractionQueryIndex {
  /** Indexed layout-node entries in preorder. */
  readonly entries: readonly QuireLayoutInteractionQueryEntry[];
  /** Coarse buckets used to narrow per-pointer layout-node queries. */
  readonly buckets: readonly QuireLayoutInteractionQueryIndexBucket[];
  /** Entry indexes not covered by any page or viewport bucket. */
  readonly unbucketedEntryIndexes: readonly number[];
  /** Total number of indexed entries. */
  readonly entryCount: number;
}

/** Consumer-neutral immutable product of one layout compilation. */
export interface QuireLayoutProductSnapshot {
  /** Observable pagination-text admission and convergence failures. */
  readonly paginationTextDiagnostics?: readonly import("./engine/types").QuirePaginationTextDiagnostic[] | undefined;
  /** Accepted inline placement references, retained for exact object property editing. */
  readonly placementAnchors?: readonly import("./engine/types").QuireLayoutAnchor[] | undefined;
  /** Root layout node for the visible document. */
  readonly root: QuireLayoutNode;
  /** Full document bounds in canvas coordinate space. */
  readonly documentRect: QuireRect;
  /** Viewport bounds used when the snapshot was produced. */
  readonly viewportRect: QuireRect;
  /** DOM overlays that should be hosted above the rendered canvas. */
  readonly domOverlays: readonly QuireLayoutDomOverlay[];
  /** Compiled region-owned artifacts shared by render and interaction consumers. */
  readonly layerContributions?: readonly QuireRetainedLayerContribution[] | undefined;
  /** Retained hit targets produced by the layout pass. */
  readonly hitTargets: readonly QuireHitTarget[];
  /** Optional coarse index for narrowing retained layer target hit testing. */
  readonly layerTargetIndex?: QuireViewLayerTargetIndex | undefined;
  /** Optional coarse index for narrowing retained layout-node interaction queries. */
  readonly interactionQueryIndex?: QuireLayoutInteractionQueryIndex | undefined;
  /** Snapshot-owned adapter structure index used by range selection planning. */
  readonly selectionStructureIndex?:
    QuireSelectionStructureIntervalIndex | undefined;
  /** Optional page boxes produced by a paginated layout pass. */
  readonly pages?: readonly QuireLayoutPage[] | undefined;
  /** Region-owned selection policies consumed by shared command routing. */
  readonly regionSelectionPolicies?: readonly QuireRetainedRegionSelectionPolicy[] | undefined;
  /** Rejected retained-region declarations exposed to diagnostics. */
  readonly regionProductGaps?: readonly QuireRetainedRegionProductGap[] | undefined;
  /** Inline placements rejected before retained products could be compiled. */
  readonly inlinePlacementGaps?: readonly QuireInlinePlacementGap[] | undefined;
  /** Retained view graph when this shape has passed production authority validation. */
  readonly viewGraph?: QuireViewGraphSnapshot | undefined;
}

/** Layout snapshot fields collected before retained graph validation completes. */
export type QuireLayoutProductSnapshotDraft = Omit<
  QuireLayoutProductSnapshot,
  "viewGraph"
>;

/** Consumer-neutral layout product carrying its mandatory retained view graph. */
export interface QuireRetainedLayoutProductSnapshot extends QuireLayoutProductSnapshot {
  /** Retained view graph validated by the layout snapshot authority. */
  readonly viewGraph: QuireViewGraphSnapshot;
  /** Required ready-or-unavailable consumer compilation for this graph version. */
  readonly consumerCompilation: QuireViewConsumerCompilation;
}
