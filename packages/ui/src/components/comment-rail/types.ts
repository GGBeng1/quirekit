/** Viewport geometry needed to place one anchor in a comment rail. */
export interface QuireKitCommentAnchorProjection {
  /** Anchor top in browser viewport coordinates. */
  readonly anchorClientY: number;
  /** Comment-list origin in browser viewport coordinates. */
  readonly railClientY: number;
}

/** Measured geometry of one comment card, in document order. */
export interface QuireKitCommentCardGeometry {
  /** Anchor top relative to the comment-list origin. */
  readonly anchorTop: number;
  /** Measured card height in CSS pixels. */
  readonly cardHeight: number;
}

/** Collision-free layout of one document-height comment rail. */
export interface QuireKitCommentRailLayout {
  /** Card tops relative to the comment-list origin, in input order. */
  readonly cardTops: readonly number[];
  /** Bottom of the collision-expanded card stack. */
  readonly stackBottom: number;
  /** Rail height, at least the document height. */
  readonly railHeight: number;
  /** Whether the cards extend past the document height. */
  readonly hasDocumentOverflow: boolean;
}
