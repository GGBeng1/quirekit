import type { QuireRect } from "@quirekit/renderer";
import type { QuireInlineSourceVisualOccurrence } from "@quirekit/layout/inline";
import type { QuireLayoutRegionKind } from "@quirekit/layout/identity";

/** Exact document-space rectangles available to anchored-object placement. */
export interface QuireInlinePlacementReferenceSet {
  /** Caret-aligned rectangle of the logical inline source. */
  readonly anchor: QuireRect;
  /** Exact measured line rectangle that contains the source. */
  readonly line: QuireRect;
  /** Exact source textblock rectangle that contains the source. */
  readonly paragraph: QuireRect;
  /** Exact retained owner bounds used by region-constrained placement. */
  readonly containingRegion: QuireRect;
  /** Exact receiving column rectangle, when a projection declares one. */
  readonly column?: QuireRect | undefined;
  /** Exact receiving margin rectangle, when a projection declares one. */
  readonly margin?: QuireRect | undefined;
  /** Exact receiving page rectangle, when a projection declares one. */
  readonly page?: QuireRect | undefined;
}

/** Minimal source occurrence needed to resolve one anchored placement. */
export interface QuireInlinePlacementSource {
  /** Stable logical source-anchor identity. */
  readonly sourceAnchorId: string;
  /** Single or page-local occurrence represented by this placement pass. */
  readonly occurrence: QuireInlineSourceVisualOccurrence;
  /** Exact reference rectangles available at this layout phase. */
  readonly placementReferences: QuireInlinePlacementReferenceSet;
  /** Exact retained owner kind when the current phase has resolved ownership. */
  readonly ownerRegionKind?: QuireLayoutRegionKind | undefined;
}

/** Stable failure code produced by anchored-object placement compilation. */
export type QuireInlinePlacementGapCode =
  | "missing-capability"
  | "invalid-extent"
  | "invalid-reference-geometry"
  | "missing-inline-reference"
  | "missing-block-reference"
  | "missing-containing-region"
  | "extent-exceeds-containing-region"
  | "unsupported-logical-alignment"
  | "flow-exclusion-non-convergence";

/** Typed gap produced instead of guessed positioned-object geometry. */
export interface QuireInlinePlacementGap {
  /** Stable machine-readable gap code. */
  readonly code: QuireInlinePlacementGapCode;
  /** Logical source anchor whose placement could not compile. */
  readonly sourceAnchorId: string;
  /** Stable semantic object identity from the source capability. */
  readonly objectId: string;
  /** Missing or unsupported reference name, when applicable. */
  readonly reference?: string | undefined;
  /** Human-readable diagnostic that does not imply fallback behavior. */
  readonly message: string;
}

/** Renderer-neutral visual placement resolved from explicit layout references. */
export interface QuireInlineVisualPlacement {
  /** Logical source anchor represented by the placement. */
  readonly sourceAnchorId: string;
  /** Stable semantic object identity represented by the placement. */
  readonly objectId: string;
  /** Exact visual occurrence that owns the placement. */
  readonly occurrence: QuireInlineSourceVisualOccurrence;
  /** Final document-space object rectangle after explicit constraints. */
  readonly rect: QuireRect;
}

/** Result of compiling one anchored-object placement declaration. */
export type QuireInlineVisualPlacementCompileResult =
  | {
      /** Placement compiled without inferred geometry. */
      readonly status: "resolved";
      /** Exact renderer-neutral visual placement. */
      readonly placement: QuireInlineVisualPlacement;
    }
  | {
      /** Placement could not compile canonically. */
      readonly status: "gap";
      /** Typed gaps that excluded the entire positioned product. */
      readonly gaps: readonly QuireInlinePlacementGap[];
    };
