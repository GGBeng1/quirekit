import type { QuireClientRect } from "@quirekit/view-engine";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import type {
  QuireInteractionRectAtPositionResult,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";

/** Viewport coordinate pair accepted by DOM-like view geometry APIs. */
export interface QuireViewViewportCoords {
  /** Horizontal viewport coordinate in CSS pixels. */
  readonly left: number;
  /** Vertical viewport coordinate in CSS pixels. */
  readonly top: number;
}

/** DOM-like document position returned from viewport coordinate hit testing. */
export interface QuireViewPosAtCoordsResult {
  /** Document position nearest to the viewport coordinates. */
  readonly pos: number;
  /** Inner node position containing the coordinates, or -1 at the top level. */
  readonly inside: number;
  /** Exact source anchor of a retained floating object owning this hit. */
  readonly objectPosition?: number | undefined;
  /** Retained visual context needed to map the position back to this occurrence. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}

/** DOM-like rectangle returned for a document position. */
export interface QuireViewCoordsAtPosResult {
  /** Left edge in viewport CSS pixels. */
  readonly left: number;
  /** Right edge in viewport CSS pixels. */
  readonly right: number;
  /** Top edge in viewport CSS pixels. */
  readonly top: number;
  /** Bottom edge in viewport CSS pixels. */
  readonly bottom: number;
}

/** Resolved retained and client geometry for a document position. */
export interface QuireViewResolvedCoordsAtPos {
  /** Retained interaction-geometry answer in document coordinates. */
  readonly rectAtPosition: QuireInteractionRectAtPositionResult;
  /** DOM-like client rectangle projected from the retained answer. */
  readonly clientRect: QuireViewCoordsAtPosResult;
}

/** Direction accepted by DOM-like end-of-textblock checks. */
export type QuireViewTextblockDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "forward"
  | "backward";

/** Inputs used to map viewport coordinates into document coordinates. */
export interface QuireViewPosAtCoordsOptions {
  /** Latest mounted interaction geometry snapshot. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /** Viewport coordinates to hit-test. */
  readonly coords: QuireViewViewportCoords;
  /** Surface rectangle used as the coordinate conversion origin. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds the surface client rectangle maps onto, when known. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/** Inputs used to map a document position into viewport coordinates. */
export interface QuireViewCoordsAtPosOptions {
  /** Latest mounted interaction geometry snapshot. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /** Document position to map. */
  readonly pos: number;
  /** Side preference when the position sits between two boxes. */
  readonly side?: number | undefined;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
  /** Surface rectangle used as the viewport coordinate origin. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds the surface client rectangle maps onto, when known. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/** Inputs used to answer whether movement leaves the current textblock. */
export interface QuireViewEndOfTextblockOptions {
  /** Latest mounted interaction geometry snapshot. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /** Direction requested by keyboard navigation. */
  readonly direction: QuireViewTextblockDirection;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
}
