import type { DrawingPayload } from "./types";

/** References available to horizontal floating-object placement intent. */
export type DrawingAnchorHorizontalReference =
  | "character"
  | "column"
  | "margin"
  | "page";

/** References available to vertical floating-object placement intent. */
export type DrawingAnchorVerticalReference =
  | "line"
  | "paragraph"
  | "margin"
  | "page";

/** Horizontal alignments interpreted against a logical reference. */
export type DrawingAnchorHorizontalAlignment =
  | "start"
  | "center"
  | "end"
  | "inside"
  | "outside";

/** Vertical alignments interpreted against a logical reference. */
export type DrawingAnchorVerticalAlignment =
  | "top"
  | "center"
  | "bottom"
  | "inside"
  | "outside";

/** Logical offset placement on one axis. */
export interface DrawingAnchorOffsetPosition<Reference extends string> {
  /** Positioning strategy. */
  readonly kind: "offset";
  /** Logical reference that owns the offset origin. */
  readonly relativeTo: Reference;
  /** Signed logical-axis offset from the reference origin. */
  readonly offset: number;
}

/** Logical aligned placement on one axis. */
export interface DrawingAnchorAlignedPosition<
  Reference extends string,
  Alignment extends string
> {
  /** Positioning strategy. */
  readonly kind: "alignment";
  /** Logical reference whose extent is aligned. */
  readonly relativeTo: Reference;
  /** Alignment inside or around the reference extent. */
  readonly alignment: Alignment;
}

/** Persisted horizontal placement intent. */
export type DrawingAnchorHorizontalPosition =
  | DrawingAnchorOffsetPosition<DrawingAnchorHorizontalReference>
  | DrawingAnchorAlignedPosition<
      DrawingAnchorHorizontalReference,
      DrawingAnchorHorizontalAlignment
    >;

/** Persisted vertical placement intent. */
export type DrawingAnchorVerticalPosition =
  | DrawingAnchorOffsetPosition<DrawingAnchorVerticalReference>
  | DrawingAnchorAlignedPosition<
      DrawingAnchorVerticalReference,
      DrawingAnchorVerticalAlignment
    >;

/** Logical distances between an object and surrounding flow. */
export interface DrawingWrapDistances {
  /** Block-start distance. */
  readonly top: number;
  /** Inline-end distance. */
  readonly right: number;
  /** Block-end distance. */
  readonly bottom: number;
  /** Inline-start distance. */
  readonly left: number;
}

/** One normalized point in drawing-local contour coordinates. */
export interface DrawingWrapContourPoint {
  /** Horizontal coordinate in the inclusive range from zero to one. */
  readonly x: number;
  /** Vertical coordinate in the inclusive range from zero to one. */
  readonly y: number;
}

/** One closed contour path used by tight and through wrapping. */
export interface DrawingWrapContourPath {
  /** At least three drawing-local points; layout closes the last edge. */
  readonly points: readonly DrawingWrapContourPoint[];
}

/** Optional drawing-local contour source shared by drawing kinds. */
export interface DrawingWrapContour {
  /** Closed paths interpreted through the even-odd fill rule. */
  readonly paths: readonly DrawingWrapContourPath[];
}

/** Word-shaped wrap modes accepted as persisted source intent. */
export type DrawingWrapMode =
  | "none"
  | "square"
  | "tight"
  | "through"
  | "top-and-bottom";

/** Sides on which inline flow may remain beside an exclusion. */
export type DrawingWrapSide = "both" | "left" | "right" | "largest";

/** Persisted flow-wrapping intent. */
export interface DrawingWrap {
  /** Requested wrap algorithm. Layout support is capability-gated separately. */
  readonly mode: DrawingWrapMode;
  /** Requested side policy for adjacent inline flow. */
  readonly side: DrawingWrapSide;
  /** Logical clearance around the object. */
  readonly distances: DrawingWrapDistances;
  /** Optional normalized contour used by tight and through algorithms. */
  readonly contour: DrawingWrapContour | null;
}

/** Authoring input whose contour may rely on the canonical bounds fallback. */
export type DrawingWrapInput = Omit<DrawingWrap, "contour"> & {
  /** Optional normalized contour; omission uses the drawing bounds. */
  readonly contour?: DrawingWrapContour | null;
};

/** Participation of the drawing in paragraph flow. */
export type DrawingAnchorLayoutMode = "inline" | "anchored";

/** Movement policy applied to an anchored drawing occurrence. */
export type DrawingAnchorMovement = "move-with-text" | "fixed-on-page";

/**
 * Anchoring, placement and wrapping of one drawing object in flowing text.
 *
 * @typeParam Drawing - Drawing payload owned by the document model.
 */
export interface DrawingAnchor<Drawing = DrawingPayload> {
  /** Stable anchor object identity. */
  readonly objectId: string;
  /** Drawing painted inside the object frame. */
  readonly drawing: Drawing;
  /** Inline or anchored placement. */
  readonly layoutMode: DrawingAnchorLayoutMode;
  /** Whether an anchored object moves with its anchor text. */
  readonly anchorMovement: DrawingAnchorMovement;
  /** Horizontal placement intent. */
  readonly horizontalPosition: DrawingAnchorHorizontalPosition;
  /** Vertical placement intent. */
  readonly verticalPosition: DrawingAnchorVerticalPosition;
  /** Flow-wrapping intent. */
  readonly wrap: DrawingWrap;
  /** Paint plane relative to body text. */
  readonly paintOrder: "behind-text" | "in-front-of-text";
  /** Stable relative overlap order. */
  readonly stackingOrder: number;
  /** Whether other objects may overlap this one. */
  readonly allowOverlap: boolean;
  /** Whether placement is constrained to the containing table cell. */
  readonly layoutInCell: boolean;
  /** Referenced text-box story identity, or null. */
  readonly storyId: string | null;
}

/** Partial change of a drawing anchor excluding its identity. */
export type DrawingAnchorPatch<Drawing = DrawingPayload> = Readonly<
  Partial<Omit<DrawingAnchor<Drawing>, "objectId" | "wrap">>
  & { readonly wrap?: Readonly<Partial<DrawingWrapInput>> }
>;

/** Authoring input for a new drawing anchor; omitted fields receive model defaults. */
export type DrawingAnchorInput<Drawing = DrawingPayload> = Readonly<
  Partial<Omit<DrawingAnchor<Drawing>, "objectId" | "drawing" | "wrap">>
  & { readonly objectId: string; readonly drawing?: Partial<Drawing>; readonly wrap?: DrawingWrapInput }
>;
