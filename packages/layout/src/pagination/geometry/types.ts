import type { QuireRect } from "@quirekit/renderer";

/** Optional body rectangles selected by physical page position. */
export interface QuirePageBodyRectVariants {
  /** Body rectangle used by the first physical page. */
  readonly first?: QuireRect | undefined;
  /** Body rectangle used by odd physical pages after the first page. */
  readonly odd?: QuireRect | undefined;
  /** Body rectangle used by even physical pages. */
  readonly even?: QuireRect | undefined;
}

/** One column slot expressed relative to the page body rectangle. */
export interface QuirePageColumn {
  /** Horizontal offset from the body rectangle's left edge, in CSS pixels. */
  readonly offset: number;
  /** Column width in CSS pixels. */
  readonly width: number;
}

/** Multi-column body layout shared by every page of one geometry template. */
export interface QuirePageColumnTemplate {
  /** Ordered column slots; templates always describe at least two columns. */
  readonly columns: readonly QuirePageColumn[];
  /** Whether a separator line is drawn before every non-empty column after the first. */
  readonly separator: boolean;
  /** Width at which body content is measured, never wider than any column. */
  readonly measureWidth: number;
}

/** Geometry template used when deriving page fragments. */
export interface QuirePageGeometry {
  /** Full page rectangle for the first page in document layout coordinates. */
  readonly pageRect: QuireRect;
  /** Body rectangle available for flow content on the first page. */
  readonly bodyRect: QuireRect;
  /** Optional page-position body rectangles expressed in first-page coordinates. */
  readonly bodyRectVariants?: QuirePageBodyRectVariants | undefined;
  /** Vertical gap inserted between resolved page rectangles. */
  readonly pageGap?: number;
  /** Optional multi-column body layout; absent means one column equal to the body. */
  readonly columns?: QuirePageColumnTemplate | undefined;
  /**
   * Document-space top of the first page's body when the flow starts below other
   * content already placed on that page. Only narrows page zero's body and columns.
   */
  readonly firstPageBodyTop?: number | undefined;
  /**
   * Document-space bottom of the first page's body when the page bottom already
   * holds notes of an earlier section sharing the page. Only narrows page zero.
   */
  readonly firstPageBodyBottom?: number | undefined;
  /** Whether the columns of the last page are balanced to equal heights. */
  readonly balanceLastPageColumns?: boolean | undefined;
}

/** Page and body rectangles resolved for one concrete page index. */
export interface QuireResolvedPageGeometry {
  /** Full page rectangle for a concrete page in document layout coordinates. */
  readonly pageRect: QuireRect;
  /** Body rectangle for a concrete page in document layout coordinates. */
  readonly bodyRect: QuireRect;
  /** Column rectangles in document layout coordinates, present only for multi-column pages. */
  readonly columnRects?: readonly QuireRect[] | undefined;
}


/** Values determining page geometry, policy, and collected source-context coverage. */
export interface QuirePaginationGeometryKeyOptions {
  /** Page geometry template resolved by the page driver. */
  readonly pageGeometry: QuirePageGeometry;
  /** Widow policy value. */
  readonly widows?: number | undefined;
  /** Orphan policy value. */
  readonly orphans?: number | undefined;
  /** Whether retained pages include query provenance. Defaults to true. */
  readonly collectSourceFragments?: boolean | undefined;
  /** Normalized projection clips controlling source-context collection. */
  readonly projectionClipRects?: readonly QuireRect[] | undefined;
}
