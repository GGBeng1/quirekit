import type {
  QuireLayoutOwnerFacts,
  QuireLayoutQueryProductOwner
} from "@quirekit/layout/products";
import type {
  QuireDocumentPosition,
  QuireDocumentRange,
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutPage,
  QuireRetainedRegionSelectionPolicyKind
} from "../../layout";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type {
  QuireSelectionGeometryContext,
  QuireSelectionRangeGeometry,
  QuireTableCellSelectionHit,
  QuireTableRowOffsetSlotHit
} from "../types";
import type { QuireInteractionDiagnosticQuerySource } from "../diagnostics";
import type {
  QuireLayoutRegionRef,
  QuireLayoutCapabilitySet,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireViewInteractionHit,
  QuireViewLayerHitCandidate,
  QuireViewLayerRef,
  QuireViewLayerTargetIndexQueryDiagnostics,
  QuireViewLayerTargetDecision,
  QuireViewPointerPolicy
} from "../../view-graph";

/** Source path that produced an interaction geometry answer. */
export type QuireInteractionGeometryQuerySource =
  QuireInteractionDiagnosticQuerySource;

/** Common provenance attached to interaction geometry answers. */
export interface QuireInteractionGeometryProvenance {
  /** Source path that produced the geometry answer. */
  readonly source: QuireInteractionGeometryQuerySource;
  /** Optional retained view graph version used by the query. */
  readonly snapshotVersion?: number | undefined;
  /** Optional retained region represented by the answer. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Optional layout query-product owner represented by the answer. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Enclosing story owner that gates interaction without replacing exact provenance. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Source identity carried explicitly by the exact retained hit. */
  readonly ownerSource?: QuireLayoutSourceRef | undefined;
  /** Capabilities carried explicitly by the exact retained hit. */
  readonly ownerCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Optional retained layer represented by the answer. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Optional pointer policy represented by the answer. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Optional canonical interaction hit represented by the answer. */
  readonly interactionHit?: QuireViewInteractionHit | undefined;
  /** Optional region-owned policy used by selection and command routing. */
  readonly selectionPolicy?: QuireRetainedRegionSelectionPolicyKind | undefined;
  /** Optional retained layer candidates observed at the queried point. */
  readonly layerHitChain?: readonly QuireViewLayerHitCandidate[] | undefined;
  /** Optional retained layer target index query diagnostics observed at the queried point. */
  readonly layerTargetIndexQuery?: QuireViewLayerTargetIndexQueryDiagnostics | undefined;
  /** Optional retained target policy decisions observed at the queried point. */
  readonly targetChain?: readonly QuireViewLayerTargetDecision[] | undefined;
}

/** Options used to resolve a document position from a document-space point. */
export interface QuireInteractionPositionAtPointOptions {
  /** Layout snapshot that owns retained geometry products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space point to query. */
  readonly point: QuirePoint;
}

/** Interaction geometry result for a document position hit. */
export interface QuireInteractionPositionAtPointHit
  extends QuireInteractionGeometryProvenance {
  /** Discriminator for position hits. */
  readonly kind: "position";
  /** Document position nearest to the queried point. */
  readonly position: QuireDocumentPosition;
  /** Start position of the nearest inner document node hit by the point. */
  readonly inside: number;
  /** Geometry that was hit or used for mapping. */
  readonly rect: QuireRect;
  /** Optional Word row-offset table grid slot represented by this hit. */
  readonly tableRowOffsetSlot?: QuireTableRowOffsetSlotHit | undefined;
  /** Optional structural Word table-cell facts represented by this hit. */
  readonly tableCell?: QuireTableCellSelectionHit | undefined;
}

/** Interaction geometry result for a point miss. */
export interface QuireInteractionPositionAtPointMiss
  extends QuireInteractionGeometryProvenance {
  /** Discriminator for misses. */
  readonly kind: "miss";
}

/** Result of resolving a document-space point against interaction geometry. */
export type QuireInteractionPositionAtPointResult =
  | QuireInteractionPositionAtPointHit
  | QuireInteractionPositionAtPointMiss;

/** Options used to resolve the nearest caret from a document-space point. */
export interface QuireInteractionNearestCaretAtPointOptions {
  /** Layout snapshot that owns retained geometry products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space point to query. */
  readonly point: QuirePoint;
  /** Optional exact retained region that bounds the caret query. */
  readonly region?: QuireLayoutRegionRef | undefined;
}

/** Options used to resolve a nearest caret within one page's canonical body source. */
export interface QuireInteractionPageBodyNearestCaretOptions {
  /** Complete retained layout snapshot containing body and page-chrome products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Page whose body rectangle and document range bound the caret query. */
  readonly page: QuireLayoutPage;
  /** Document-space point already projected onto the page body. */
  readonly point: QuirePoint;
  /** Canonical body source identity allowed to answer the query. */
  readonly sourceId: string;
}

/** Interaction geometry result for a nearest-caret point query. */
export interface QuireInteractionNearestCaretAtPointHit
  extends QuireInteractionGeometryProvenance {
  /** Discriminator for caret hits. */
  readonly kind: "caret";
  /** Document position nearest to the queried point. */
  readonly position: QuireDocumentPosition;
  /** Start position of the nearest inner document node represented by the caret. */
  readonly inside: number;
  /** Geometry used to resolve the caret. */
  readonly rect: QuireRect;
  /** Optional Word row-offset table grid slot represented by this hit. */
  readonly tableRowOffsetSlot?: QuireTableRowOffsetSlotHit | undefined;
  /** Optional structural Word table-cell facts represented by this hit. */
  readonly tableCell?: QuireTableCellSelectionHit | undefined;
}

/** Interaction geometry result for a nearest-caret point miss. */
export interface QuireInteractionNearestCaretAtPointMiss
  extends QuireInteractionGeometryProvenance {
  /** Discriminator for misses. */
  readonly kind: "miss";
}

/** Result of resolving the nearest caret from a document-space point. */
export type QuireInteractionNearestCaretAtPointResult =
  | QuireInteractionNearestCaretAtPointHit
  | QuireInteractionNearestCaretAtPointMiss;

/** Options used to resolve a raw interaction target from a document-space point. */
export interface QuireInteractionHitTargetAtPointOptions {
  /** Layout snapshot that owns retained geometry products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space point to query. */
  readonly point: QuirePoint;
}

/** Interaction target resolved from a retained interaction hit. */
export interface QuireInteractionHitTargetAtPointInteractionHit
  extends QuireInteractionGeometryProvenance {
  /** Discriminator for point target hits. */
  readonly kind: "hit";
  /** Target class represented by this answer. */
  readonly targetKind: "interaction-hit";
  /** Canonical retained interaction hit represented by the point. */
  readonly interactionHit: QuireViewInteractionHit;
  /** Document position nearest to the queried point. */
  readonly position: QuireDocumentPosition;
  /** Start position of the nearest inner document node hit by the point. */
  readonly inside: number;
  /** Geometry that was hit or used for mapping. */
  readonly rect: QuireRect;
  /** Optional Word row-offset table grid slot represented by this hit. */
  readonly tableRowOffsetSlot?: QuireTableRowOffsetSlotHit | undefined;
  /** Optional structural Word table-cell facts represented by this hit. */
  readonly tableCell?: QuireTableCellSelectionHit | undefined;
}

/** Interaction target resolved from canonical position geometry. */
export interface QuireInteractionHitTargetAtPointPositionHit
  extends QuireInteractionGeometryProvenance {
  /** Discriminator for point target hits. */
  readonly kind: "hit";
  /** Target class represented by this answer. */
  readonly targetKind: "position";
  /** Document position nearest to the queried point. */
  readonly position: QuireDocumentPosition;
  /** Start position of the nearest inner document node hit by the point. */
  readonly inside: number;
  /** Geometry that was hit or used for mapping. */
  readonly rect: QuireRect;
  /** Optional Word row-offset table grid slot represented by this hit. */
  readonly tableRowOffsetSlot?: QuireTableRowOffsetSlotHit | undefined;
  /** Optional structural Word table-cell facts represented by this hit. */
  readonly tableCell?: QuireTableCellSelectionHit | undefined;
}

/** Interaction target result for a point miss. */
export interface QuireInteractionHitTargetAtPointMiss
  extends QuireInteractionGeometryProvenance {
  /** Discriminator for misses. */
  readonly kind: "miss";
}

/** Hit target resolved from a document-space point. */
export type QuireInteractionHitTargetAtPointHit =
  | QuireInteractionHitTargetAtPointInteractionHit
  | QuireInteractionHitTargetAtPointPositionHit;

/** Result of resolving a document-space point to an interaction target. */
export type QuireInteractionHitTargetAtPointResult =
  | QuireInteractionHitTargetAtPointHit
  | QuireInteractionHitTargetAtPointMiss;

/** Options used to resolve a caret rectangle for a document position. */
export interface QuireInteractionRectAtPositionOptions {
  /** Layout snapshot that owns retained geometry products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document position to query. */
  readonly position: number;
  /** Side preference when a position sits between visual boxes. */
  readonly side?: number | undefined;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/** Interaction geometry result for a document-position rectangle. */
export interface QuireInteractionRectAtPositionResult
  extends QuireInteractionGeometryProvenance {
  /** Rectangle in document coordinates. */
  readonly rect: QuireRect;
}

/** Options used to resolve a collapsed caret from retained interaction geometry. */
export interface QuireInteractionCaretAtPositionOptions {
  /** Layout snapshot that owns retained geometry products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Collapsed document position to query. */
  readonly position: number;
  /** Width used for the returned caret rectangle. */
  readonly caretWidth?: number | undefined;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/** Interaction geometry result for a collapsed caret. */
export interface QuireInteractionCaretAtPositionResult
  extends QuireInteractionGeometryProvenance {
  /** Document position represented by the caret. */
  readonly position: QuireDocumentPosition;
  /** Caret rectangle in document coordinates. */
  readonly rect: QuireRect;
}

/** Options used to resolve selection rectangles from interaction geometry. */
export interface QuireInteractionSelectionRectsOptions {
  /** Layout snapshot that owns retained geometry products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document range to map to visible selection rectangles. */
  readonly range: QuireDocumentRange;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/** Interaction geometry result for selection rectangles. */
export interface QuireInteractionSelectionRectsResult
  extends QuireInteractionGeometryProvenance {
  /** Selection rectangles in document coordinates. */
  readonly ranges: readonly QuireSelectionRangeGeometry[];
}

/** Role of an input anchor requested by a mounted input or composition proxy. */
export type QuireInteractionInputAnchorRole =
  | "caret"
  | "selection"
  | "composition";

/** Options used to resolve an input anchor from retained interaction geometry. */
export interface QuireInteractionInputAnchorOptions {
  /** Layout snapshot that owns retained geometry products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document position that should own the input anchor. */
  readonly position: number;
  /** Preferred anchor role for the active input state. */
  readonly role: QuireInteractionInputAnchorRole;
  /** Optional visible geometry used to disambiguate repeated retained anchors. */
  readonly referenceRect?: QuireRect | undefined;
}

/** Interaction geometry result for a retained input anchor. */
export interface QuireInteractionInputAnchorResult
  extends QuireInteractionGeometryProvenance {
  /** Anchor rectangle in document coordinates. */
  readonly rect: QuireRect;
}

/** Options used to create a snapshot-backed interaction geometry authority. */
export interface QuireInteractionGeometryAuthorityOptions {
  /** Layout snapshot that owns retained interaction geometry products. */
  readonly snapshot: QuireLayoutSnapshot;
}

/** Snapshot-backed authority for interaction geometry queries. */
export interface QuireInteractionGeometryAuthority {
  /**
   * Resolves a raw interaction target from a document-space point.
   *
   * @param point - Document-space point to query.
   * @returns Hit-target result for the point.
   */
  hitTargetAt(point: QuirePoint): QuireInteractionHitTargetAtPointResult;

  /**
   * Resolves a document position from a document-space point.
   *
   * @param point - Document-space point to query.
   * @returns Position result for the point.
   */
  posAtCoords(point: QuirePoint): QuireInteractionPositionAtPointResult;

  /**
   * Resolves the nearest caret from a document-space point.
   *
   * @param point - Document-space point to query.
   * @returns Nearest-caret result for the point.
   */
  nearestCaret(point: QuirePoint): QuireInteractionNearestCaretAtPointResult;

  /**
   * Resolves a visual rectangle for a document position.
   *
   * @param position - Document position to query.
   * @param side - Optional side preference when a position sits between visual boxes.
   * @param selectionContext - Optional retained context for repeated visual instances.
   * @returns Rectangle query result with provenance.
   */
  coordsAtPos(
    position: number,
    side?: number,
    selectionContext?: QuireSelectionGeometryContext
  ): QuireInteractionRectAtPositionResult;

  /**
   * Resolves collapsed caret geometry for a document position.
   *
   * @param position - Collapsed document position to query.
   * @param caretWidth - Optional caret width for the returned rectangle.
   * @param selectionContext - Optional retained context for repeated visual instances.
   * @returns Collapsed caret result, or null when no caret can be mapped.
   */
  caretAtPosition(
    position: number,
    caretWidth?: number,
    selectionContext?: QuireSelectionGeometryContext
  ): QuireInteractionCaretAtPositionResult | null;

  /**
   * Resolves selection rectangles from retained interaction geometry.
   *
   * @param range - Document range to map.
   * @param selectionContext - Optional retained context for repeated visual instances.
   * @returns Selection rectangles with provenance.
   */
  selectionRects(
    range: QuireDocumentRange,
    selectionContext?: QuireSelectionGeometryContext
  ): QuireInteractionSelectionRectsResult;

  /**
   * Resolves an input anchor from retained interaction geometry.
   *
   * @param position - Document position that should own the input anchor.
   * @param role - Preferred anchor role for the active input state.
   * @param referenceRect - Optional visible geometry used to disambiguate repeated retained anchors.
   * @returns Retained input anchor result, or null when none matches.
   */
  inputAnchor(
    position: number,
    role: QuireInteractionInputAnchorRole,
    referenceRect?: QuireRect
  ): QuireInteractionInputAnchorResult | null;
}
