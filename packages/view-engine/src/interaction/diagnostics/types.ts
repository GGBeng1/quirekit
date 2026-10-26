import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type {
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireInlinePlacementGap,
  QuireRetainedRegionProductGap
} from "../../layout";
import type {
  QuireLayoutRegionRef,
  QuireLayoutRootId
} from "@quirekit/layout/identity";
import type {
  QuireViewInteractionHit,
  QuireViewCoordinatePath,
  QuireViewLayerHitCandidate,
  QuireViewLayerRef,
  QuireViewLayerTargetDecision,
  QuireViewLayerTargetIndexQueryDiagnostics,
  QuireViewPointerPolicy
} from "../../view-graph";

/** Source path that produced an interaction geometry or pointer answer. */
export type QuireInteractionDiagnosticQuerySource =
  | "retained-hit-target"
  | "retained-position"
  | "retained-nearest-caret"
  | "layout-caret"
  | "layout-rect"
  | "layout-selection-rects"
  | "sub-layout-input-anchor"
  | "viewport-fallback";

/** Migration or fallback path observed while resolving an interaction answer. */
export type QuireInteractionMigrationFallbackKind =
  | "layout-snapshot-geometry-adapter"
  | "viewport-rect-fallback"
  | "sub-layout-input-anchor"
  | "input-anchor-viewport-fallback"
  | "svg-browser-measurement-refinement";

/** Mounted pointer policy decision observed after hit testing. */
export type QuireInteractionPointerPolicyDecisionKind =
  | "widget-dispatch"
  | "locked-hit-test"
  | "selection"
  | "target-dispatch"
  | "pass-through"
  | "focus-only";

/** Source that produced the active input proxy or composition anchor. */
export type QuireInteractionInputAnchorDiagnosticSource =
  | "sub-layout-input-anchor"
  | "layout-caret"
  | "layout-selection-rects"
  | "viewport-fallback";

/** Browser client point captured for coordinate diagnostics. */
export interface QuireInteractionClientPointDiagnostics {
  /** Horizontal client coordinate in CSS pixels. */
  readonly clientX: number;
  /** Vertical client coordinate in CSS pixels. */
  readonly clientY: number;
}

/** Browser client rectangle captured for coordinate diagnostics. */
export interface QuireInteractionClientRectDiagnostics {
  /** Left edge in browser client CSS pixels. */
  readonly left: number;
  /** Top edge in browser client CSS pixels. */
  readonly top: number;
  /** Width in browser client CSS pixels. */
  readonly width: number;
  /** Height in browser client CSS pixels. */
  readonly height: number;
}

/** Coordinate conversion path used by a pointer or geometry query. */
export interface QuireInteractionCoordinatePathDiagnostics {
  /** Coordinate-space labels traversed by the query. */
  readonly spaces: QuireViewCoordinatePath["spaces"];
  /** Full coordinate path with conversion steps used by the query. */
  readonly path: QuireViewCoordinatePath;
  /** Browser client point used as the query input. */
  readonly clientPoint: QuireInteractionClientPointDiagnostics;
  /** Mounted surface rectangle used as the client coordinate origin. */
  readonly surfaceClientRect: QuireInteractionClientRectDiagnostics;
  /** Document-space bounds represented by the mounted surface. */
  readonly surfaceBounds: QuireRect;
  /** Document-space point produced by the coordinate authority. */
  readonly documentPoint: QuirePoint;
}

/** Fallback entry preserved for retained-geometry coverage audits. */
export interface QuireInteractionMigrationFallbackUsage {
  /** Stable fallback kind used by diagnostics and tests. */
  readonly kind: QuireInteractionMigrationFallbackKind;
  /** Source path that triggered this usage, when tied to a query. */
  readonly source?: QuireInteractionDiagnosticQuerySource | undefined;
  /** Human-readable reason for why the path was used. */
  readonly reason?: string | undefined;
}

/** Selection-domain facts attached to one interaction diagnostic summary. */
export interface QuireInteractionSelectionDiagnostics {
  /** Selection domain resolved from interaction facts or PM fallback. */
  readonly domain: string;
  /** Command target class resolved for the selection domain. */
  readonly commandTarget?: string | undefined;
  /** Concrete hit kind that produced the selection domain. */
  readonly hitKind?: string | undefined;
  /** Selection command route family resolved by command routing, when known. */
  readonly routeKind?: string | undefined;
  /** Routed command intent that consumed the selection domain, when known. */
  readonly intent?: string | undefined;
  /** Selection-command consumer that handled the route, when known. */
  readonly consumer?: string | undefined;
  /** Observable selection-command effect produced by the consumer, when known. */
  readonly effect?: string | undefined;
  /** Fallback surface selected when the route was unhandled, when known. */
  readonly fallback?: string | undefined;
}

/** Pointer-policy decision attached after mounted pointer routing. */
export interface QuireInteractionPointerPolicyDiagnostics {
  /** Mounted pointer decision kind. */
  readonly decision: QuireInteractionPointerPolicyDecisionKind;
  /** Retained pointer policy that produced the decision, when available. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Whether this decision passed through to lower layers or fallback geometry. */
  readonly passThrough: boolean;
}

/** Input anchor facts used by mounted input proxy or composition placement. */
export interface QuireInteractionInputAnchorDiagnostics {
  /** Source that produced the anchor rectangle. */
  readonly source: QuireInteractionInputAnchorDiagnosticSource;
  /** Document position requested by the active input state. */
  readonly position?: number | undefined;
  /** Anchor role requested by the active input state. */
  readonly role?: string | undefined;
  /** Rectangle used to place the input proxy or composition proxy. */
  readonly rect: QuireRect;
}

/** Root and region facts observed during interaction routing. */
export interface QuireInteractionRootRegionDiagnostics {
  /** Retained root that owns the interaction answer, when known. */
  readonly root?: QuireLayoutRootId | undefined;
  /** Retained region that owns the interaction answer, when known. */
  readonly region?: QuireLayoutRegionRef | undefined;
}

/** Unified interaction diagnostics used to prove retained product coverage. */
export interface QuireInteractionDiagnostics {
  /** Retained view graph version used by the query. */
  readonly snapshotVersion?: number | undefined;
  /** Source path that produced the primary geometry answer. */
  readonly querySource?: QuireInteractionDiagnosticQuerySource | undefined;
  /** Coordinate conversion path used before the query, when a client point was involved. */
  readonly coordinatePath?: QuireInteractionCoordinatePathDiagnostics | undefined;
  /** Retained root and region facts observed by the query. */
  readonly rootRegion?: QuireInteractionRootRegionDiagnostics | undefined;
  /** Layout query-product owner facts observed by the query. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Retained layer that produced the primary answer, when known. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Pointer policy carried by the primary retained hit, when known. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Canonical interaction hit represented by the answer, when available. */
  readonly interactionHit?: QuireViewInteractionHit | undefined;
  /** Retained layer candidates observed at the queried point. */
  readonly layerHitChain?: readonly QuireViewLayerHitCandidate[] | undefined;
  /** Coarse retained target index query diagnostics observed at the queried point. */
  readonly layerTargetIndexQuery?: QuireViewLayerTargetIndexQueryDiagnostics | undefined;
  /** Retained target policy decisions evaluated for the point. */
  readonly targetChain?: readonly QuireViewLayerTargetDecision[] | undefined;
  /** Pass-through decisions extracted from the retained target chain. */
  readonly passThroughDecisions?: readonly QuireViewLayerTargetDecision[] | undefined;
  /** Selection-domain facts resolved above interaction hits. */
  readonly selection?: QuireInteractionSelectionDiagnostics | undefined;
  /** Mounted pointer-policy decision resolved after hit testing. */
  readonly pointerDecision?: QuireInteractionPointerPolicyDiagnostics | undefined;
  /** Input anchor facts used for hidden input or composition placement. */
  readonly inputAnchor?: QuireInteractionInputAnchorDiagnostics | undefined;
  /** Migration or fallback paths used while producing the answer. */
  readonly migrationFallbacks?: readonly QuireInteractionMigrationFallbackUsage[] | undefined;
  /** Retained-region declarations rejected by production authority validation. */
  readonly regionProductGaps?: readonly QuireRetainedRegionProductGap[] | undefined;
  /** Inline placements rejected before retained products could be compiled. */
  readonly inlinePlacementGaps?: readonly QuireInlinePlacementGap[] | undefined;
}

/** Input used to create coordinate-path diagnostics for a pointer query. */
export interface CreateQuireInteractionCoordinatePathDiagnosticsOptions {
  /** Coordinate conversion path produced by the coordinate authority. */
  readonly path: QuireViewCoordinatePath;
  /** Browser client point before coordinate conversion. */
  readonly clientPoint: QuireInteractionClientPointDiagnostics;
  /** Mounted surface client rectangle used by the coordinate authority. */
  readonly surfaceClientRect: QuireInteractionClientRectDiagnostics;
  /** Document-space bounds represented by the mounted surface. */
  readonly surfaceBounds: QuireRect;
  /** Document-space point produced by the coordinate authority. */
  readonly documentPoint: QuirePoint;
}

/** Input used to create geometry diagnostics from an interaction provenance record. */
export interface CreateQuireInteractionGeometryDiagnosticsOptions {
  /** Source path that produced the geometry answer. */
  readonly source: QuireInteractionDiagnosticQuerySource;
  /** Retained view graph version used by the query. */
  readonly snapshotVersion?: number | undefined;
  /** Retained region represented by the answer. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Layout query-product owner represented by the answer. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Retained layer represented by the answer. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Pointer policy represented by the answer. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Canonical interaction hit represented by the answer. */
  readonly interactionHit?: QuireViewInteractionHit | undefined;
  /** Retained layer candidates observed at the queried point. */
  readonly layerHitChain?: readonly QuireViewLayerHitCandidate[] | undefined;
  /** Coarse retained target index query diagnostics observed at the queried point. */
  readonly layerTargetIndexQuery?: QuireViewLayerTargetIndexQueryDiagnostics | undefined;
  /** Retained target policy decisions evaluated for the point. */
  readonly targetChain?: readonly QuireViewLayerTargetDecision[] | undefined;
}

/** Input used to create diagnostics from a resolved interaction selection target. */
export interface CreateQuireInteractionSelectionTargetDiagnosticsOptions {
  /** Selection domain resolved from the interaction target. */
  readonly domain: string;
  /** Command target class resolved from the interaction target. */
  readonly commandTarget: string;
  /** Concrete interaction hit kind that produced the target. */
  readonly hitKind: string;
  /** Retained region that produced the target, when available. */
  readonly region?: QuireLayoutRegionRef | undefined;
  /** Retained layer that produced the target, when available. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Pointer policy declared by the target, when available. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Canonical interaction hit represented by the target, when available. */
  readonly interactionHit?: QuireViewInteractionHit | undefined;
}

/** Input used to create diagnostics from a selection command route. */
export interface CreateQuireInteractionCommandRouteDiagnosticsOptions {
  /** Selection command route family that command routing selected. */
  readonly routeKind: string;
  /** Selection command intent represented by the route. */
  readonly intent: string;
  /** Selection domain that owned command interpretation. */
  readonly selectionDomain: string;
  /** Concrete command target class that produced the route. */
  readonly targetKind: string;
  /** Retained root that owns the active command target, when known. */
  readonly activeRoot?: QuireLayoutRootId | undefined;
  /** Retained region that owns the active command target, when known. */
  readonly activeRegion?: QuireLayoutRegionRef | undefined;
  /** Interaction target that produced the route, when available. */
  readonly interactionTarget?:
    | CreateQuireInteractionSelectionTargetDiagnosticsOptions
    | undefined;
  /** Selection-command consumer that handled the route, when known. */
  readonly consumer?: string | undefined;
  /** Observable command effect produced by the consumer, when known. */
  readonly effect?: string | undefined;
  /** Fallback surface selected when the route was unhandled, when known. */
  readonly fallback?: string | undefined;
}
