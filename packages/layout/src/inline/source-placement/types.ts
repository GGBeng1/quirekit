/** References available to inline-axis placement intent. */
export type QuireInlineSourceInlineReference =
  | "anchor"
  | "column"
  | "margin"
  | "page";

/** References available to block-axis placement intent. */
export type QuireInlineSourceBlockReference =
  | "line"
  | "paragraph"
  | "margin"
  | "page";

/** Logical alignment values shared by anchored-object placement. */
export type QuireInlineSourceAlignment =
  | "start"
  | "center"
  | "end"
  | "inside"
  | "outside";

/** Offset placement against one declared layout reference. */
export interface QuireInlineSourceOffsetPlacement<Reference extends string> {
  /** Placement strategy. */
  readonly kind: "offset";
  /** Layout authority that owns the offset origin. */
  readonly reference: Reference;
  /** Signed offset from the reference origin. */
  readonly offset: number;
}

/** Aligned placement against one declared layout reference. */
export interface QuireInlineSourceAlignedPlacement<Reference extends string> {
  /** Placement strategy. */
  readonly kind: "alignment";
  /** Layout authority whose extent is aligned. */
  readonly reference: Reference;
  /** Logical alignment inside or around the reference extent. */
  readonly alignment: QuireInlineSourceAlignment;
}

/** Inline-axis placement intent. */
export type QuireInlineSourceInlinePlacement =
  | QuireInlineSourceOffsetPlacement<QuireInlineSourceInlineReference>
  | QuireInlineSourceAlignedPlacement<QuireInlineSourceInlineReference>;

/** Block-axis placement intent. */
export type QuireInlineSourceBlockPlacement =
  | QuireInlineSourceOffsetPlacement<QuireInlineSourceBlockReference>
  | QuireInlineSourceAlignedPlacement<QuireInlineSourceBlockReference>;

/** Finite non-negative visual frame with at least one positive axis. */
export interface QuireInlineSourceExtent {
  /** Requested inline size; may be zero for a one-dimensional visual object. */
  readonly inlineSize: number;
  /** Requested block size; may be zero for a one-dimensional visual object. */
  readonly blockSize: number;
  /** Optional distance from block start to the shared inline text baseline. */
  readonly baselineOffset?: number | undefined;
}

/** Clearance added around rectangular flow exclusion geometry. */
export interface QuireInlineSourceClearance {
  /** Block-start clearance. */
  readonly blockStart: number;
  /** Inline-end clearance. */
  readonly inlineEnd: number;
  /** Block-end clearance. */
  readonly blockEnd: number;
  /** Inline-start clearance. */
  readonly inlineStart: number;
}

/** One normalized point in drawing-local contour coordinates. */
export interface QuireInlineSourceContourPoint {
  /** Horizontal coordinate in the inclusive range from zero to one. */
  readonly x: number;
  /** Vertical coordinate in the inclusive range from zero to one. */
  readonly y: number;
}

/** One closed normalized contour path supplied by a drawing source. */
export interface QuireInlineSourceContourPath {
  /** Drawing-local points; layout closes the final edge. */
  readonly points: readonly QuireInlineSourceContourPoint[];
}

/** Participation of one drawing occurrence in surrounding paragraph flow. */
export type QuireInlineSourceLayoutMode = "inline" | "anchored";

/** Movement policy applied after an anchored occurrence resolves. */
export type QuireInlineSourceAnchorMovement =
  | "move-with-text"
  | "fixed-on-page";

/** Flow policy compiled from one anchored-object declaration. */
export type QuireInlineSourceFlowExclusionIntent =
  | {
      /** The object does not remove space from surrounding text flow. */
      readonly kind: "none";
    }
  | {
      /** The object's clearance-expanded rectangle removes inline space. */
      readonly kind: "rectangle";
      /** Physical side policy retained until paragraph direction is known. */
      readonly side: "both" | "left" | "right" | "largest";
      /** Logical clearance applied around the requested extent. */
      readonly clearance: QuireInlineSourceClearance;
    }
  | {
      /** The object's contour envelope removes inline space per row band. */
      readonly kind: "contour-envelope";
      /** Physical side policy retained until paragraph direction is known. */
      readonly side: "both" | "left" | "right" | "largest";
      /** Logical clearance applied around the resolved contour. */
      readonly clearance: QuireInlineSourceClearance;
      /** Normalized drawing-local contour paths. */
      readonly paths: readonly QuireInlineSourceContourPath[];
    }
  | {
      /** Even-odd contour interiors remove inline space per row band. */
      readonly kind: "contour-through";
      /** Physical side policy retained until paragraph direction is known. */
      readonly side: "both" | "left" | "right" | "largest";
      /** Logical clearance applied around each resolved contour interval. */
      readonly clearance: QuireInlineSourceClearance;
      /** Normalized drawing-local contour paths. */
      readonly paths: readonly QuireInlineSourceContourPath[];
    }
  | {
      /** Any intersecting row loses its complete inline interval. */
      readonly kind: "block-band";
      /** Logical clearance applied around the requested extent. */
      readonly clearance: QuireInlineSourceClearance;
    };

/** Renderer-neutral placement declaration compiled from one logical source. */
export interface QuireInlineSourcePlacementDeclaration {
  /** Stable semantic identity of the represented object. */
  readonly objectId: string;
  /** Requested visual extent before layout constraints. */
  readonly extent: QuireInlineSourceExtent;
  /** Whether the object is a line item or an independently placed anchor. */
  readonly layoutMode: QuireInlineSourceLayoutMode;
  /** Whether an anchored object follows its paragraph or stays page-fixed. */
  readonly anchorMovement: QuireInlineSourceAnchorMovement;
  /** Renderer-neutral inline-axis placement intent. */
  readonly inlinePlacement: QuireInlineSourceInlinePlacement;
  /** Renderer-neutral block-axis placement intent. */
  readonly blockPlacement: QuireInlineSourceBlockPlacement;
  /** Flow exclusion intent consumed before text shaping. */
  readonly flowExclusion: QuireInlineSourceFlowExclusionIntent;
  /** Paint relationship to the main content plane. */
  readonly paintOrder: "behind-content" | "above-content";
  /** Stable relative order among overlapping anchored objects. */
  readonly stackingOrder: number;
  /** Whether overlap with other anchored objects is permitted. */
  readonly allowOverlap: boolean;
  /** Whether the containing retained region constrains placement. */
  readonly constrainToRegion: boolean;
  /** Optional owner kind that activates the containing-region constraint. */
  readonly constraintOwnerKind?: "table-cell" | undefined;
  /** Whether manipulation must preserve the requested aspect ratio. */
  readonly lockAspectRatio: boolean;
  /** Optional independently editable story identity. */
  readonly storyId: string | null;
}
