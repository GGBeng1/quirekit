import type {
  QuireAffineTransform,
  QuireDocumentPosition,
  QuireDocumentRange,
  QuireHitArea,
  QuireRect
} from "@quirekit/renderer";
import type { QuireBlockFlowBox } from "@quirekit/layout/block-flow";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutExportFallback,
  QuireLayoutRegionRef,
  QuireLayoutRoot,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type { QuirePageFragment } from "@quirekit/layout/pagination";
import type {
  QuireViewInteractionHit,
  QuireViewLayerRef,
  QuireViewPointerPolicy
} from "../../view-graph";
import type {
  QuireInlineSourceAnchor,
  QuireInlineSourceVisualOccurrence,
  QuireInlineSourceVisualOccurrenceGap
} from "@quirekit/layout/inline";
import type {
  QuireInlineSourceCapabilitySidecar
} from "./inline/source-capability";
import type {
  QuireInlinePlacementGap,
  QuireInlinePlacementReferenceSet
} from "./inline/placement-reference";
import type { QuireTableLayoutSnapshot } from "./table";
import type { QuireRetainedRegionProducts } from "../region-products";
import type { QuireLayoutBoxSubLayoutFragment } from "./sub-layout";
import type {
  QuireLayoutOwnerFacts,
  QuireLayoutQueryProductOwner
} from "@quirekit/layout/products";
import type {
  QuireBlockTextFlowReflow,
  QuireParagraphDecoration
} from "./block-types";

/** Identity of a layout node that can later back PM/Tiptap compatibility APIs. */
export interface QuireLayoutNodeHandle {
  /** Stable handle id within a layout snapshot. */
  readonly id: string;
  /** ProseMirror node type name represented by the handle. */
  readonly type: string;
  /** Document range represented by the handle. */
  readonly range: QuireDocumentRange;
}

/** Renderer-neutral source anchor retained by a layout document. */
export interface QuireLayoutAnchor {
  /** Snapshot-unique id of this consumable visual occurrence. */
  readonly id: string;
  /** Stable logical source anchor id retained across visual occurrences. */
  readonly sourceAnchorId: string;
  /** Canonical kind of renderer-neutral layout anchor. */
  readonly kind: "inline-source";
  /** Exact inline node type represented by the source anchor. */
  readonly nodeType: string;
  /** Document range represented by the anchor. */
  readonly range: QuireDocumentRange;
  /** Canonical document position used to resolve anchor geometry. */
  readonly position: QuireDocumentPosition;
  /** Preferred visual side when the position has two valid caret stops. */
  readonly affinity: QuireInlineSourceAnchor["affinity"];
  /** Explicit single or page-derived occurrence represented by this anchor. */
  readonly occurrence: QuireInlineSourceVisualOccurrence;
  /** View-space rectangle used by overlays and popovers. */
  readonly rect: QuireRect;
  /** Explicit document-space authorities available to object placement. */
  readonly placementReferences: QuireInlinePlacementReferenceSet;
  /** Exact retained owner facts of the layout box that produced the anchor. */
  readonly owner: QuireLayoutOwnerFacts;
  /** Optional enclosing story owner that gates descendant interaction. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
}

/** Hit-test target emitted by the layout engine. */
export interface QuireHitTarget {
  /** Stable target id within a layout snapshot. */
  readonly id: string;
  /** Document range represented by this target. */
  readonly range: QuireDocumentRange;
  /** Rectangle that participates in hit testing. */
  readonly rect: QuireRect;
  /** Optional exact geometry evaluated after the coarse rectangle. */
  readonly hitArea?: QuireHitArea | undefined;
  /** Optional node handle associated with the target. */
  readonly nodeHandle?: QuireLayoutNodeHandle;
  /** Optional retained view-graph region represented by the target. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Optional layout query-product owner that produced this target. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Enclosing story owner that gates interaction without replacing the exact target owner. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Source identity carried explicitly by this exact target. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Capabilities carried explicitly by this exact target. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
  /** Optional retained visual layer that owns the target. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Optional pointer policy declared by the target. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Optional canonical interaction hit represented by the target. */
  readonly interactionHit?: QuireViewInteractionHit | undefined;
}

/** Common layout box emitted by the future recursive engine. */
export interface QuireLayoutBox extends QuireBlockFlowBox {
  /** Minimum resolved first/following-line width for insertion, in document CSS pixels. */
  readonly inlineContentWidth?: number | undefined;
  /** Optional paragraph background and border paint metadata. */
  readonly paragraphDecoration?: QuireParagraphDecoration | undefined;
  /** Opacity of the complete owned paint batch. */
  readonly paintOpacity?: number;
  /** Optional affine applied only while painting this box's direct content. */
  readonly paintTransform?: QuireAffineTransform | undefined;
  /** Optional axis-aligned bounds after applying `paintTransform`. */
  readonly paintBounds?: QuireRect | undefined;
  /** Outer hard paint boundary in final document coordinates, outside the node transform. */
  readonly paintClipRect?: QuireRect | undefined;
  /** Claimed View capability products keyed by source anchor id. */
  readonly sourceCapabilities?: readonly QuireInlineSourceCapabilitySidecar[];
  /** Source-bound paragraph reshaper retained for derived inline occurrences. */
  readonly textFlowReflow?: QuireBlockTextFlowReflow | undefined;
  /** Paragraph-local flow failures retained independently of page placement. */
  readonly flowExclusionGaps?: readonly QuireInlinePlacementGap[] | undefined;
  /** Optional node handle represented by the box. */
  readonly nodeHandle?: QuireLayoutNodeHandle;
  /** Optional retained view-graph root represented by this layout box. */
  readonly viewRoot?: QuireLayoutRoot | undefined;
  /** Optional retained view-graph region represented by this layout box. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Optional capability declarations represented by this layout box. */
  readonly viewCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Exact region-owned facts projected onto this layout box. */
  readonly layoutOwner?: QuireLayoutOwnerFacts | undefined;
  /** Optional export fallback declarations represented by this layout box. */
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  /** Optional capability-owned retained products represented by this box. */
  readonly regionProducts?: QuireRetainedRegionProducts | undefined;
  /** Retained nested-flow fragments owned by this layout box. */
  readonly subLayoutFragments?: readonly QuireLayoutBoxSubLayoutFragment[] | undefined;
  /** Optional table layout metadata owned by a table container box. */
  readonly table?: QuireTableLayoutSnapshot;
}

/** Container box that owns child layout boxes. */
export interface QuireLayoutContainer extends QuireLayoutBox {
  /** Child boxes laid out inside this container. */
  readonly children: readonly QuireLayoutBox[];
}

/** Observable preservation or convergence failure for pagination-dependent text. */
export interface QuirePaginationTextDiagnostic {
  /** Stable source anchor whose cached result is retained. */
  readonly sourceAnchorId: string;
  /** Canonical position, when an exact logical anchor exists. */
  readonly position?: number | undefined;
  /** Observable unsupported context or bounded-convergence failure. */
  readonly code: "unsupported-pagination-text-context" | "missing-pagination-text-page" | "repeated-pagination-text-source" | "missing-pagination-text-reference" | "repeated-pagination-text-reference" | "pagination-text-cycle" | "pagination-text-limit";
  /** Explanation of the retained-cache policy. */
  readonly message: string;
}

/** Top-level renderer-neutral layout document. */
export interface QuireLayoutDocument extends QuireLayoutContainer {
  /** Source caches retained when pagination text cannot be safely accepted. */
  readonly paginationTextDiagnostics?: readonly QuirePaginationTextDiagnostic[] | undefined;
  /** Renderer-neutral source anchors produced by the layout pass. */
  readonly anchors: readonly QuireLayoutAnchor[];
  /** Typed failures produced while compiling logical anchors into occurrences. */
  readonly anchorOccurrenceGaps: readonly QuireInlineSourceVisualOccurrenceGap[];
  /** Complete retained products compiled from the active anchor occurrences. */
  readonly anchorRegionProducts: QuireRetainedRegionProducts;
  /** Paragraph-local flow failures that survive page placement recompilation. */
  readonly flowExclusionGaps?: readonly QuireInlinePlacementGap[] | undefined;
  /** Typed placement failures that excluded whole anchor occurrence products. */
  readonly anchorPlacementGaps: readonly QuireInlinePlacementGap[];
  /** Hit-test targets produced by the layout pass. */
  readonly hitTargets: readonly QuireHitTarget[];
  /** Optional page fragments when pagination is enabled. */
  readonly pages: readonly QuirePageFragment[];
}
