import type {
  QuireLayoutOwnerFacts,
  QuireLayoutQueryProductOwner
} from "@quirekit/layout/products";
import type {
  QuireDocumentPosition,
  QuireDocumentRange
} from "@quirekit/renderer";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuirePoint, QuireRect } from "@quirekit/renderer";

import type { QuireLayoutSnapshot } from "../editor-layout";
import type { QuireRetainedRegionSelectionPolicyKind } from "../layout";
import type { QuireInteractionDiagnostics } from "./diagnostics";
import type {
  QuireLayoutRegionRef,
  QuireLayoutCapabilitySet,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireViewInteractionHit,
  QuireViewCoordinatePointMapping,
  QuireViewCoordinateRectMapping,
  QuireViewLayerHitCandidate,
  QuireViewLayerRef,
  QuireViewLayerTargetIndexQueryDiagnostics,
  QuireViewLayerTargetDecision,
  QuireViewPointerPolicy
} from "../view-graph";

/** Options used to build selection geometry from a layout snapshot. */
export interface QuireSelectionGeometryOptions {
  /** Layout snapshot whose editor selection should be mapped. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Width used for collapsed selection caret rectangles. */
  readonly caretWidth?: number;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/** One retained visual context used when mapping a selection back to geometry. */
export interface QuireSelectionGeometryVisualContext {
  /** Retained region that produced the active selection, when available. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Query-product owner that produced the active selection, when available. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Source identity carried explicitly by the exact retained hit. */
  readonly ownerSource?: QuireLayoutSourceRef | undefined;
  /** Capabilities carried explicitly by the exact retained hit. */
  readonly ownerCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Document-space rectangle hit by the active selection gesture, when available. */
  readonly referenceRect?: QuireRect | undefined;
}

/** Retained context used when mapping an active selection back to geometry. */
export interface QuireSelectionGeometryContext
  extends QuireSelectionGeometryVisualContext {
  /** Visual contexts that bound a range gesture, usually anchor and head. */
  readonly visualContexts?: readonly QuireSelectionGeometryVisualContext[] | undefined;
}

/** Options used to resolve an expanded text selection range from a hit position. */
export interface QuireTextSelectionRangeOptions {
  /** Layout snapshot whose measured text fragments should be searched. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document position produced by hit testing. */
  readonly position: QuireDocumentPosition;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/** Options used to resolve the canonical textblock owning a hit position. */
export interface QuireTextblockSelectionRangeOptions {
  /** ProseMirror document that owns canonical block structure. */
  readonly doc: ProseMirrorNode;
  /** Document position produced by hit testing. */
  readonly position: QuireDocumentPosition;
}

/** Direction requested by visual-line caret navigation. */
export type QuireVerticalCaretNavigationDirection = "up" | "down";

/** Options used to resolve vertical caret movement from layout geometry. */
export interface QuireVerticalCaretNavigationOptions {
  /** Layout snapshot whose measured text fragments should be searched. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Current collapsed document position. */
  readonly position: QuireDocumentPosition;
  /** Visual-line movement direction. */
  readonly direction: QuireVerticalCaretNavigationDirection;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/** DOM-like point reported by browser pointer events. */
export interface QuireClientPoint {
  /** Horizontal client coordinate reported by the browser event. */
  readonly clientX: number;
  /** Vertical client coordinate reported by the browser event. */
  readonly clientY: number;
}

/** Browser click event shape consumed by the canvas click tracker. */
export interface QuirePointerClickEvent extends QuireClientPoint {
  /** Browser event timestamp for the click-producing pointer event. */
  readonly timeStamp: number;
  /** Browser-provided click count when available. */
  readonly detail?: number | undefined;
}

/** Options used to create a canvas pointer click tracker. */
export interface QuirePointerClickTrackerOptions {
  /** Maximum interval between clicks that should be considered one click series. */
  readonly intervalMs?: number | undefined;
  /** Maximum pointer movement between clicks in the same click series. */
  readonly distancePx?: number | undefined;
}

/** Recent pointer click metadata used to normalize browser multi-click behavior. */
export interface QuirePointerClickState {
  /** Browser event timestamp for the last pointer down. */
  readonly timeStamp: number;
  /** Client point where the last click started. */
  readonly clientPoint: QuireClientPoint;
  /** Normalized click count for the current click series. */
  readonly count: number;
}

/** Stateful tracker that normalizes browser multi-click behavior. */
export interface QuirePointerClickTracker {
  /**
   * Resolves a stable click count for a browser pointer click event.
   *
   * @param event - Pointer event shape containing client coordinates and timing.
   * @returns Normalized click count for the active click series.
   */
  resolveClickCount(event: QuirePointerClickEvent): number;
  /**
   * Reads the latest click series metadata.
   *
   * @returns Current click series state, or null before the first click.
   */
  snapshot(): QuirePointerClickState | null;
  /**
   * Clears the current click series state.
   */
  reset(): void;
}

/** DOMRect-like bounds for the canvas element in client coordinates. */
export interface QuireClientRect {
  /** Canvas left edge in client coordinates. */
  readonly left: number;
  /** Canvas top edge in client coordinates. */
  readonly top: number;
  /** Canvas width in CSS pixels. */
  readonly width: number;
  /** Canvas height in CSS pixels. */
  readonly height: number;
}

/** Options used to convert a browser client point into canvas coordinates. */
export interface QuireClientPointMappingOptions {
  /** Browser client point to convert. */
  readonly clientPoint: QuireClientPoint;
  /** Canvas client rectangle used as the conversion origin. */
  readonly canvasClientRect: QuireClientRect;
  /** Document-space bounds the client rectangle maps onto, when known. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/** Client-space point in browser CSS pixels accepted by the coordinate authority. */
export interface QuireViewClientPoint {
  /** Horizontal client coordinate in CSS pixels. */
  readonly left: number;
  /** Vertical client coordinate in CSS pixels. */
  readonly top: number;
}

/** Client-space rectangle in browser CSS pixels produced by the coordinate authority. */
export interface QuireViewClientRect {
  /** Left edge in client CSS pixels. */
  readonly left: number;
  /** Right edge in client CSS pixels. */
  readonly right: number;
  /** Top edge in client CSS pixels. */
  readonly top: number;
  /** Bottom edge in client CSS pixels. */
  readonly bottom: number;
}

/**
 * Surface projection that anchors one backend's client rectangle to the document.
 *
 * The coordinate authority maps between document and client space using this
 * projection, so each backend declares exactly which document-space bounds its
 * client rectangle represents instead of every call site assuming the origin.
 */
export interface QuireViewSurfaceProjection {
  /** Surface client rectangle in browser CSS pixels. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds the surface client rectangle maps onto. */
  readonly surfaceBounds: QuireRect;
}

/**
 * Single coordinate authority that converts between document and client space.
 *
 * One instance is built per mounted backend surface and used by caret/selection
 * geometry, hit testing, and the input proxy so the mappings cannot drift.
 */
export interface QuireViewCoordinateAuthority {
  /** Surface projection that defines this authority's coordinate mapping. */
  readonly projection: QuireViewSurfaceProjection;
  /** Horizontal document-to-client scale derived from the projection. */
  readonly scaleX: number;
  /** Vertical document-to-client scale derived from the projection. */
  readonly scaleY: number;
  /**
   * Maps a client point to a document-space point with a conversion path.
   *
   * @param point - Client point in browser CSS pixels.
   * @returns Tagged point mapping from client to document space.
   */
  clientToDocumentPoint(
    point: QuireViewClientPoint
  ): QuireViewCoordinatePointMapping<"client", "document">;
  /**
   * Maps a document-space point to a client point with a conversion path.
   *
   * @param point - Document-space point in the layout snapshot coordinate space.
   * @returns Tagged point mapping from document to client space.
   */
  documentToClientPoint(
    point: QuirePoint
  ): QuireViewCoordinatePointMapping<"document", "client">;
  /**
   * Maps a document-space rectangle to a client rectangle with a conversion path.
   *
   * @param rect - Document-space rectangle in the layout snapshot coordinate space.
   * @returns Tagged rectangle mapping from document to client space.
   */
  documentToClientRect(
    rect: QuireRect
  ): QuireViewCoordinateRectMapping<"document", "client">;
  /**
   * Maps a client point to its document-space point.
   *
   * @param point - Client point in browser CSS pixels.
   * @returns Document-space point in the layout snapshot coordinate space.
   */
  documentPointFromClient(point: QuireViewClientPoint): QuirePoint;
  /**
   * Maps a document-space point to its client point.
   *
   * @param point - Document-space point in the layout snapshot coordinate space.
   * @returns Client point in browser CSS pixels.
   */
  clientPointFromDocument(point: QuirePoint): QuireViewClientPoint;
  /**
   * Maps a document-space rectangle to its client-space rectangle.
   *
   * @param rect - Document-space rectangle in the layout snapshot coordinate space.
   * @returns Client-space rectangle in browser CSS pixels.
   */
  clientRectFromDocument(rect: QuireRect): QuireViewClientRect;
}

/** Options used to hit-test a browser pointer point against canvas layout. */
export interface QuirePointerHitTestOptions extends QuireClientPointMappingOptions {
  /** Layout snapshot whose nodes should be tested. */
  readonly snapshot: QuireLayoutSnapshot;
}

/** Word row-offset omitted grid slot retained for diagnostics and boundary mapping. */
export interface QuireTableRowOffsetSlotHit {
  /** Discriminator for row-offset slot hits. */
  readonly kind: "table-row-offset-slot";
  /** Stable table id carried by the table layout snapshot. */
  readonly tableId: string;
  /** Document range represented by the table node. */
  readonly tableRange: QuireDocumentRange;
  /** Source row index that owns the slot. */
  readonly rowIndex: number;
  /** Grid column index represented by the slot. */
  readonly columnIndex: number;
  /** Source mechanism that produced the row-offset slot. */
  readonly sourceKind: "row-offset";
  /** Row-offset side that produced the slot. */
  readonly side: "before" | "after";
  /** Document-space rectangle occupied by the slot. */
  readonly rect: QuireRect;
}

/** Structural Word table-cell facts retained on a position hit. */
export interface QuireTableCellSelectionHit {
  /** Stable table id carried by the layout snapshot. */
  readonly tableId: string;
  /** Absolute ProseMirror position before the owning table node. */
  readonly tablePos: number;
  /** Semantic cell id shared by merged and repeated visual fragments. */
  readonly semanticCellId: string;
  /** Table-relative position before the origin explicit cell. */
  readonly originCellPos: number;
  /** Canonical document range represented by the semantic cell. */
  readonly range: QuireDocumentRange;
  /** Document-space rectangle represented by this visual cell occurrence. */
  readonly rect: QuireRect;
  /** Whether this occurrence belongs to a repeated table-header fragment. */
  readonly isRepeatedHeader?: boolean | undefined;
}

/** Hit test result for a point that maps to a document position. */
export interface QuirePositionHitTestResult {
  /** Discriminator for document position hit results. */
  readonly kind: "position";
  /** Document position nearest to the tested point. */
  readonly position: QuireDocumentPosition;
  /** Start position of the nearest inner document node hit by the point. */
  readonly inside: number;
  /** Geometry that was hit or used for mapping. */
  readonly rect: QuireRect;
  /** Optional retained view-graph region that produced the hit. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Optional layout query-product owner that produced the hit. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Enclosing story owner that gates interaction without replacing the exact hit owner. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Source identity carried explicitly by the exact retained hit. */
  readonly ownerSource?: QuireLayoutSourceRef | undefined;
  /** Capabilities carried explicitly by the exact retained hit. */
  readonly ownerCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Optional retained layer that produced the hit. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Optional pointer policy active for the hit. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Optional region-owned policy used by selection and command routing. */
  readonly selectionPolicy?: QuireRetainedRegionSelectionPolicyKind | undefined;
  /** Optional canonical interaction hit represented by the result. */
  readonly interactionHit?: QuireViewInteractionHit | undefined;
  /** Optional Word row-offset table grid slot represented by this hit. */
  readonly tableRowOffsetSlot?: QuireTableRowOffsetSlotHit | undefined;
  /** Optional structural Word table-cell facts represented by this position hit. */
  readonly tableCell?: QuireTableCellSelectionHit | undefined;
  /** Optional retained layer candidates observed at the hit point. */
  readonly layerHitChain?: readonly QuireViewLayerHitCandidate[] | undefined;
  /** Optional retained layer target index query diagnostics observed at the hit point. */
  readonly layerTargetIndexQuery?: QuireViewLayerTargetIndexQueryDiagnostics | undefined;
  /** Optional retained target policy decisions observed at the hit point. */
  readonly targetChain?: readonly QuireViewLayerTargetDecision[] | undefined;
  /** Unified interaction diagnostics used for migration and fallback audits. */
  readonly diagnostics?: QuireInteractionDiagnostics | undefined;
}

/** Hit test result for a point outside the document layout. */
export interface QuireMissHitTestResult {
  /** Discriminator for misses. */
  readonly kind: "miss";
  /** Unified interaction diagnostics used for migration and fallback audits. */
  readonly diagnostics?: QuireInteractionDiagnostics | undefined;
}

/** Result of mapping a canvas point back into document space. */
export type QuireHitTestResult =
  | QuirePositionHitTestResult
  | QuireMissHitTestResult;

/** Geometry for a collapsed selection caret. */
export interface QuireCaretGeometry {
  /** Document position represented by the caret. */
  readonly position: QuireDocumentPosition;
  /** Caret rectangle in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Optional layout query-product owner that produced the caret. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}

/** Geometry for a selected document range. */
export interface QuireSelectionRangeGeometry {
  /** Document range represented by the selection rectangle. */
  readonly range: QuireDocumentRange;
  /** Selection rectangle in canvas coordinate space. */
  readonly rect: QuireRect;
  /**
   * Backend measurement policy for this retained rectangle.
   *
   * Ordinary text geometry may be refined by browser glyph measurements.
   * Exact structure boxes must survive backend measurement unchanged.
   */
  readonly measurementPolicy?: "refine-text" | "preserve" | undefined;
  /** Optional layout query-product owner that produced the selection rectangle. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}

/** Canvas geometry for the current editor selection. */
export interface QuireSelectionGeometry {
  /** Caret rectangles for collapsed or multi-caret selections. */
  readonly carets: readonly QuireCaretGeometry[];
  /** Range rectangles for non-collapsed selections. */
  readonly ranges: readonly QuireSelectionRangeGeometry[];
}
