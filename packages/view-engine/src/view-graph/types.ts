import type {
  QuireLayoutCapabilitySet,
  QuireLayoutCoordinateSpaceKind,
  QuireLayoutRegion,
  QuireLayoutRegionId,
  QuireLayoutRegionRef,
  QuireLayoutRoot,
  QuireLayoutRootId,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireDocumentPosition,
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";

/** Coordinate space label used by retained geometry and diagnostics. */
export type QuireViewCoordinateSpaceKind =
  | "client"
  | "viewport"
  | "canvas-physical"
  | QuireLayoutCoordinateSpaceKind;

/** Coordinate-space-tagged point used by retained view graph products. */
export interface QuireViewCoordinatePoint<
  Space extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind
> {
  /** Coordinate space that owns the numeric point. */
  readonly space: Space;
  /** Horizontal coordinate inside the owning space. */
  readonly x: number;
  /** Vertical coordinate inside the owning space. */
  readonly y: number;
}

/** Coordinate-space-tagged rectangle used by retained view graph products. */
export interface QuireViewCoordinateRect<
  Space extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind
> {
  /** Coordinate space that owns the numeric rectangle. */
  readonly space: Space;
  /** Horizontal rectangle origin inside the owning space. */
  readonly x: number;
  /** Vertical rectangle origin inside the owning space. */
  readonly y: number;
  /** Rectangle width inside the owning space. */
  readonly width: number;
  /** Rectangle height inside the owning space. */
  readonly height: number;
}

/** Coordinate-space-tagged size used for surfaces and backing stores. */
export interface QuireViewCoordinateSize<
  Space extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind
> {
  /** Coordinate space that owns the numeric size. */
  readonly space: Space;
  /** Width inside the owning coordinate space. */
  readonly width: number;
  /** Height inside the owning coordinate space. */
  readonly height: number;
}

/** One explicit coordinate conversion step preserved for diagnostics and tests. */
export interface QuireViewCoordinateConversionStep<
  From extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind,
  To extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind
> {
  /** Source coordinate space. */
  readonly from: From;
  /** Destination coordinate space. */
  readonly to: To;
  /** Input point before conversion. */
  readonly input: QuireViewCoordinatePoint<From>;
  /** Output point after conversion. */
  readonly output: QuireViewCoordinatePoint<To>;
  /** Horizontal scale applied by the conversion. */
  readonly scaleX: number;
  /** Vertical scale applied by the conversion. */
  readonly scaleY: number;
}

/** Explicit coordinate path traversed by one retained query product. */
export interface QuireViewCoordinatePath {
  /** Ordered coordinate spaces traversed by the query. */
  readonly spaces: readonly QuireViewCoordinateSpaceKind[];
  /** Concrete conversion steps used by the query. */
  readonly steps: readonly QuireViewCoordinateConversionStep[];
}

/** Coordinate-space-tagged point mapping result. */
export interface QuireViewCoordinatePointMapping<
  From extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind,
  To extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind
> {
  /** Source-space point before conversion. */
  readonly from: QuireViewCoordinatePoint<From>;
  /** Destination-space point after conversion. */
  readonly to: QuireViewCoordinatePoint<To>;
  /** Coordinate path used by the conversion. */
  readonly path: QuireViewCoordinatePath;
}

/** Coordinate-space-tagged rectangle mapping result. */
export interface QuireViewCoordinateRectMapping<
  From extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind,
  To extends QuireViewCoordinateSpaceKind = QuireViewCoordinateSpaceKind
> {
  /** Source-space rectangle before conversion. */
  readonly from: QuireViewCoordinateRect<From>;
  /** Destination-space rectangle after conversion. */
  readonly to: QuireViewCoordinateRect<To>;
  /** Coordinate path used by the conversion. */
  readonly path: QuireViewCoordinatePath;
}

/** Visual layer plane used by retained interaction and compositor policy. */
export type QuireViewLayerPlane =
  | "page-background"
  | "drawing-behind-content"
  | "content"
  | "page-chrome"
  | "selection"
  | "annotation"
  | "drawing"
  | "controls"
  | "dom-proxy"
  | "floating-ui";

/** Consumer mode used when filtering the editor layer stack. */
export type QuireViewLayerStackConsumerKind =
  | "interactive"
  | "print"
  | "accessibility"
  | "diagnostics";

/** Last-mile paint surface used by mounted interactive renderers. */
export type QuireViewLayerPaintSurface = "content" | "overlay";

/** Runtime condition controlling whether one retained layer product is realized. */
export type QuireViewLayerActivation = Readonly<{
  /** Selected-owner activation evaluated against the owner and optional nested range. */
  kind: "selected-owner";
  /** Optional nested text range that keeps the containing owner selected while editing. */
  relatedRange?: QuireDocumentRange | undefined;
}>;

/** Pointer policy declared by retained interaction targets. */
export type QuireViewPointerPolicyKind =
  | "select"
  | "dispatch"
  | "pass-through"
  | "focus-only";

/** Performance invariant that every canonical retained view graph must declare. */
export type QuireViewGraphPerformanceInvariantKind =
  | "versioned-snapshots"
  | "typed-invalidation"
  | "layout-paint-dirty-split"
  | "viewport-indexed-queries"
  | "retained-display-chunks"
  | "no-per-pointer-layout"
  | "no-display-list-geometry-reconstruction"
  | "speculative-composition-layout"
  | "batched-browser-measurement"
  | "stable-target-identities"
  | "versioned-cancelable-async-jobs";

/** Supported invalidation boundary for a retained view graph snapshot. */
export type QuireViewGraphInvalidationScopeKind =
  | "document"
  | "root"
  | "region"
  | "visual-instance"
  | "page"
  | "viewport"
  | "display-chunk"
  | "selection-overlay"
  | "composition-overlay";

/** Query budget class promised by retained view graph consumers. */
export type QuireViewGraphQueryBudgetKind =
  | "constant"
  | "indexed"
  | "viewport-indexed"
  | "scan-bounded";

/** Affinity used when a document position can resolve to either side of a boundary. */
export type QuireViewAnchorAffinity = "before" | "after";

/** Retained layer reference attached to paint and interaction products. */
export interface QuireViewLayerRef {
  /** Visual plane that owns this target. */
  readonly plane: QuireViewLayerPlane;
  /** Optional z-index within the visual plane. Higher values are hit first. */
  readonly zIndex?: number | undefined;
  /** Optional tie-breaker priority within equal layer z-indexes. */
  readonly priority?: number | undefined;
}

/** Retained pointer policy declared by a hit target or layer. */
export interface QuireViewPointerPolicy {
  /** Pointer dispatch behavior requested by the retained target. */
  readonly kind: QuireViewPointerPolicyKind;
  /** Whether the mounted editor should focus after this target handles pointerdown. */
  readonly shouldFocusEditor?: boolean | undefined;
  /** Whether the browser event should be default-prevented for this policy. */
  readonly shouldPreventDefault?: boolean | undefined;
}

/** Canonical descriptor for one editor-oriented layer plane. */
export interface QuireViewLayerPlaneDescriptor {
  /** Visual plane represented by this descriptor. */
  readonly plane: QuireViewLayerPlane;
  /** Bottom-to-top paint/compositor order. Higher values paint later. */
  readonly displayOrder: number;
  /** Low-to-high hit order. Higher values are evaluated first. */
  readonly hitTestOrder: number;
  /** Default pointer policy for targets that do not override this plane. */
  readonly defaultPointerPolicy: QuireViewPointerPolicy;
  /** Consumers that should see this plane by default. */
  readonly consumers: readonly QuireViewLayerStackConsumerKind[];
}

/** Inputs used to map an editor layer plane to a mounted paint surface. */
export interface QuireViewLayerPaintSurfaceInput {
  /** Retained layer reference whose interactive paint surface should be resolved. */
  readonly layer: QuireViewLayerRef;
}

/** Canonical editor-oriented layer stack product. */
export interface QuireViewLayerStack {
  /** Plane descriptors in bottom-to-top display order. */
  readonly planes: readonly QuireViewLayerPlaneDescriptor[];
}

/** Retained layer hit candidate considered during pointer routing. */
export interface QuireViewLayerHitCandidate {
  /** Stable target id represented by the candidate. */
  readonly targetId: string;
  /** Retained layer that owns this target. */
  readonly layer: QuireViewLayerRef;
  /** Pointer policy active for this target. */
  readonly pointerPolicy: QuireViewPointerPolicy;
  /** Document-space rectangle used for hit testing. */
  readonly rect: QuireRect;
}

/** Retained layer candidate plus routing facts needed before fallback geometry. */
export interface QuireViewLayerTargetRoutingInput
  extends QuireViewLayerHitCandidate {
  /** Whether the retained target already carries an explicit interaction hit. */
  readonly hasInteractionHit: boolean;
}

/** Minimal retained target facts used to resolve canonical layer routing state. */
export interface QuireViewLayerTargetFactsInput {
  /** Explicit layer attached to the retained target. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Explicit pointer policy attached to the retained target. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Optional interaction hit that may inherit or provide layer routing facts. */
  readonly interactionHit?: {
    /** Layer attached to the concrete interaction hit. */
    readonly layer?: QuireViewLayerRef | undefined;
    /** Pointer policy attached to the concrete interaction hit. */
    readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  } | undefined;
}

/** Canonical layer and pointer-policy facts resolved for one retained target. */
export interface QuireViewLayerTargetFacts {
  /** Resolved retained layer for the target. */
  readonly layer: QuireViewLayerRef;
  /** Resolved pointer policy for the target. */
  readonly pointerPolicy: QuireViewPointerPolicy;
}

/** Decision made while evaluating one retained layer target. */
export type QuireViewLayerTargetDecisionKind =
  | "selected"
  | "target-dispatch"
  | "focus-only"
  | "pass-through";

/** Retained layer target decision exposed to diagnostics. */
export interface QuireViewLayerTargetDecision {
  /** Stable target id that was evaluated. */
  readonly targetId: string;
  /** Decision produced by the target pointer policy. */
  readonly decision: QuireViewLayerTargetDecisionKind;
  /** Retained layer that owned the evaluated target. */
  readonly layer: QuireViewLayerRef;
  /** Pointer policy used for the decision. */
  readonly pointerPolicy: QuireViewPointerPolicy;
}

/** Minimal retained target record consumed by a layer target index. */
export interface QuireViewLayerTargetIndexTarget {
  /** Stable target id represented by the indexed target. */
  readonly targetId: string;
  /** Document-space rectangle used for coarse page or viewport bucketing. */
  readonly rect: QuireRect;
}

/** Page-like coarse bucket input for retained layer target indexing. */
export interface QuireViewLayerTargetIndexPage {
  /** Zero-based page index represented by the bucket. */
  readonly pageIndex: number;
  /** Document-space page rectangle used for coarse point queries. */
  readonly rect: QuireRect;
}

/** Viewport-like coarse bucket input for retained layer target indexing. */
export interface QuireViewLayerTargetIndexViewport {
  /** Stable viewport bucket id represented by the bucket. */
  readonly viewportId: string;
  /** Document-space viewport rectangle used for coarse point queries. */
  readonly rect: QuireRect;
}

/** Coarse retained layer target bucket used before target-level hit testing. */
export interface QuireViewLayerTargetIndexBucket {
  /** Stable bucket id for diagnostics. */
  readonly bucketId: string;
  /** Optional page index when this bucket represents one page. */
  readonly pageIndex?: number | undefined;
  /** Document-space rectangle covered by the bucket. */
  readonly rect: QuireRect;
  /** Target ids whose rectangles intersect this bucket. */
  readonly targetIds: readonly string[];
}

/** Retained coarse index for narrowing layer hit target scans. */
export interface QuireViewLayerTargetIndex {
  /** Page or region buckets considered before target inspection. */
  readonly buckets: readonly QuireViewLayerTargetIndexBucket[];
  /** Targets that are not covered by any current bucket. */
  readonly unbucketedTargetIds: readonly string[];
  /** Number of retained targets represented by the index. */
  readonly targetCount: number;
}

/** Source that produced retained layer target candidate ids for diagnostics. */
export type QuireViewLayerTargetIndexQuerySource =
  | "retained-layer-target-index"
  | "unindexed-layer-target-scan";

/** One retained layer target bucket selected by a point query. */
export interface QuireViewLayerTargetIndexQueryBucket {
  /** Stable bucket id selected by the point query. */
  readonly bucketId: string;
  /** Optional page index represented by the selected bucket. */
  readonly pageIndex?: number | undefined;
  /** Target ids contributed by this bucket. */
  readonly targetIds: readonly string[];
}

/** Diagnostic result for a retained layer target index query. */
export interface QuireViewLayerTargetIndexQueryDiagnostics {
  /** Candidate target ids returned by the query. */
  readonly targetIds: readonly string[];
  /** Buckets whose rectangles contained the queried point. */
  readonly buckets: readonly QuireViewLayerTargetIndexQueryBucket[];
  /** Unbucketed target ids appended after bucket candidates. */
  readonly unbucketedTargetIds: readonly string[];
  /** Source path used to produce candidate ids. */
  readonly source: QuireViewLayerTargetIndexQuerySource;
}

/** Options for creating a retained layer target index. */
export interface CreateQuireViewLayerTargetIndexOptions {
  /** Retained targets to index by stable id. */
  readonly targets: readonly QuireViewLayerTargetIndexTarget[];
  /** Optional page buckets used for coarse viewport-first hit narrowing. */
  readonly pages?: readonly QuireViewLayerTargetIndexPage[] | undefined;
  /** Optional viewport buckets used when a snapshot is not paginated. */
  readonly viewports?: readonly QuireViewLayerTargetIndexViewport[] | undefined;
}

/** Document anchor scoped to a retained view root and region. */
export interface QuireViewAnchor {
  /** Root that owns the anchor. */
  readonly rootId: QuireLayoutRootId;
  /** Region that owns the anchor. */
  readonly regionId: QuireLayoutRegionId;
  /** Document position represented by the anchor. */
  readonly position: QuireDocumentPosition;
  /** Boundary affinity for ambiguous caret stops. */
  readonly affinity: QuireViewAnchorAffinity;
}

/** One invalidation boundary supported by a retained view graph snapshot. */
export interface QuireViewGraphInvalidationScope {
  /** Invalidation boundary kind. */
  readonly kind: QuireViewGraphInvalidationScopeKind;
  /** Optional root id when this entry describes one root boundary. */
  readonly rootId?: QuireLayoutRootId | undefined;
  /** Optional region id when this entry describes one region boundary. */
  readonly regionId?: QuireLayoutRegionId | undefined;
  /** Optional repeated visual instance id for headers, watermarks, and split content. */
  readonly visualInstanceId?: string | undefined;
  /** Optional page index when this entry describes page-local invalidation. */
  readonly pageIndex?: number | undefined;
  /** Optional retained display chunk key. */
  readonly chunkKey?: string | undefined;
  /** Optional diagnostic reason for exposing this scope. */
  readonly reason?: string | undefined;
}

/** Query complexity budget promised by retained interaction and render queries. */
export interface QuireViewGraphQueryBudget {
  /** Budget class for hot view queries. */
  readonly kind: QuireViewGraphQueryBudgetKind;
  /** Optional hard cap for bounded scans. */
  readonly maxScannedItems?: number | undefined;
  /** Optional human-readable diagnostic label. */
  readonly label?: string | undefined;
}

/** Performance contract carried by every canonical retained view graph snapshot. */
export interface QuireViewGraphPerformanceContract {
  /** Required invariants guaranteed by this snapshot and its query products. */
  readonly invariants: readonly QuireViewGraphPerformanceInvariantKind[];
  /** Invalidation scopes this snapshot can express without whole-document fallback. */
  readonly invalidationScopes: readonly QuireViewGraphInvalidationScope[];
  /** Query budget promised by interactive consumers. */
  readonly queryBudget: QuireViewGraphQueryBudget;
}

/** Common fields carried by concrete interaction hit results. */
export interface QuireViewInteractionHitBase {
  /** Region whose geometry produced this hit. */
  readonly region: QuireLayoutRegionRef;
  /** Retained layer that produced this hit target. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Pointer policy declared by this retained hit target. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Optional source identity represented by the hit. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Capabilities active for this hit target. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
}

/** Interaction hit that resolves to editable or selectable text. */
export interface QuireViewTextInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for text hits. */
  readonly kind: "text";
  /** Scoped document anchor represented by the hit. */
  readonly anchor: QuireViewAnchor;
}

/** Interaction hit that resolves to a table cell selection target. */
export interface QuireViewCellInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for table cell hits. */
  readonly kind: "cell";
  /** Stable table id. */
  readonly tableId: string;
  /** Stable cell id. */
  readonly cellId: string;
}

/** Interaction hit that resolves to a document node. */
export interface QuireViewNodeInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for node hits. */
  readonly kind: "node";
  /** Stable node id. */
  readonly nodeId: string;
  /** Document position before the node. */
  readonly pos: number;
}

/** Interaction hit that resolves to a drawing or object body. */
export interface QuireViewObjectInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for object hits. */
  readonly kind: "object";
  /** Stable object id. */
  readonly objectId: string;
}

/** Interaction hit that resolves to an image, video, or media body. */
export interface QuireViewMediaInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for media hits. */
  readonly kind: "media";
  /** Stable media id. */
  readonly mediaId: string;
  /** Media part represented by the hit. */
  readonly part: string;
}

/** Interaction hit that resolves to a plugin-provided embed. */
export interface QuireViewEmbedInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for embed hits. */
  readonly kind: "embed";
  /** Stable embed id. */
  readonly embedId: string;
  /** Embed part represented by the hit. */
  readonly part: string;
}

/** Interaction hit that resolves to a persisted content control. */
export interface QuireViewContentControlInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for content-control hits. */
  readonly kind: "content-control";
  /** Stable control id. */
  readonly controlId: string;
  /** Canonical or producer-preserved content-control discriminator. */
  readonly controlType: string;
  /** Control part represented by the hit. */
  readonly part: string;
  /** Half-open materialized owner range represented by the hit. */
  readonly range: QuireDocumentRange;
}

/** Interaction hit that resolves to an interactive widget. */
export interface QuireViewWidgetInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for widget hits. */
  readonly kind: "widget";
  /** Stable widget id. */
  readonly widgetId: string;
  /** Widget part represented by the hit. */
  readonly part: string;
}

/** Interaction hit that resolves to generated field display text. */
export interface QuireViewFieldInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for field hits. */
  readonly kind: "field";
  /** Stable field id. */
  readonly fieldId: string;
  /** Scoped document anchor represented by the field display. */
  readonly anchor: QuireViewAnchor;
}

/** Interaction hit that resolves to readonly selectable text. */
export interface QuireViewReadonlyTextInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for readonly text hits. */
  readonly kind: "readonly-text";
  /** Stable owner node id. */
  readonly ownerNodeId: string;
  /** Readonly range represented by the hit. */
  readonly range: QuireDocumentRange;
}

/** Interaction hit that resolves to a boundary caret stop. */
export interface QuireViewBoundaryCaretInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for boundary caret hits. */
  readonly kind: "boundary-caret";
  /** Scoped document anchor represented by the boundary caret. */
  readonly anchor: QuireViewAnchor;
  /** Side of the target boundary represented by the caret. */
  readonly side: QuireViewAnchorAffinity;
}

/** Interaction hit that resolves to a control surface. */
export interface QuireViewControlInteractionHit extends QuireViewInteractionHitBase {
  /** Discriminator for control hits. */
  readonly kind: "control";
  /** Stable control id. */
  readonly controlId: string;
}

/** Canonical interaction hit returned above selection semantics. */
export type QuireViewInteractionHit =
  | QuireViewTextInteractionHit
  | QuireViewCellInteractionHit
  | QuireViewNodeInteractionHit
  | QuireViewObjectInteractionHit
  | QuireViewMediaInteractionHit
  | QuireViewEmbedInteractionHit
  | QuireViewContentControlInteractionHit
  | QuireViewWidgetInteractionHit
  | QuireViewFieldInteractionHit
  | QuireViewReadonlyTextInteractionHit
  | QuireViewBoundaryCaretInteractionHit
  | QuireViewControlInteractionHit;

/** Immutable retained view graph products attached to one layout snapshot. */
export interface QuireViewGraphSnapshot {
  /** Monotonic snapshot version used by diagnostics and stale-query checks. */
  readonly version: number;
  /** Performance contract promised by this retained graph snapshot. */
  readonly performance: QuireViewGraphPerformanceContract;
  /** Retained roots known to this snapshot. */
  readonly roots: readonly QuireLayoutRoot[];
  /** Retained regions known to this snapshot. */
  readonly regions: readonly QuireLayoutRegion[];
}

/** Stable validation code for retained view graph invariant failures. */
export type QuireViewGraphValidationIssueCode =
  | "duplicate-root"
  | "duplicate-region"
  | "missing-region-root"
  | "missing-parent-region"
  | "missing-performance-contract"
  | "missing-performance-invariant"
  | "duplicate-performance-invariant"
  | "missing-invalidation-scope"
  | "invalid-query-budget"
  | "empty-root-id"
  | "empty-region-id"
  | "empty-source-id";

/** One retained view graph validation issue. */
export interface QuireViewGraphValidationIssue {
  /** Stable machine-readable issue code. */
  readonly code: QuireViewGraphValidationIssueCode;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Optional root id involved in the issue. */
  readonly rootId?: QuireLayoutRootId | undefined;
  /** Optional region id involved in the issue. */
  readonly regionId?: QuireLayoutRegionId | undefined;
}

/** Result returned by retained view graph validation. */
export interface QuireViewGraphValidationResult {
  /** Whether the graph satisfies canonical retained graph invariants. */
  readonly valid: boolean;
  /** Validation issues found in deterministic order. */
  readonly issues: readonly QuireViewGraphValidationIssue[];
}
