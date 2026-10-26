import type { QuireLayoutCoordinateRect } from "../../identity";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";

/** Explicit single or repeated occurrence represented by a flow product. */
export type QuireInlineFlowOccurrence =
  | {
      /** A single occurrence does not invent a visual-instance id. */
      readonly kind: "single";
    }
  | {
      /** A repeated occurrence requires an exact visual-instance id. */
      readonly kind: "repeated";
      /** Snapshot-local visual occurrence id. */
      readonly visualInstanceId: string;
    };

/** One measured visual line whose available inline space can be subdivided. */
export interface QuireInlineFlowLine {
  /** Snapshot-stable line id. */
  readonly id: string;
  /** Concrete text-flow occurrence that owns this line. */
  readonly scopeId: string;
  /** Exact retained owner of text placed on the line. */
  readonly owner: QuireLayoutOwnerFacts;
  /** Explicit single or repeated occurrence of the text flow. */
  readonly occurrence: QuireInlineFlowOccurrence;
  /** Coordinate-space-tagged line rectangle. */
  readonly rect: QuireLayoutCoordinateRect;
}

/** Renderer-neutral rectangle that removes inline space from one flow scope. */
export interface QuireInlineFlowExclusion {
  /** Snapshot-stable exclusion id. */
  readonly id: string;
  /** Concrete text-flow occurrence affected by this exclusion. */
  readonly targetScopeId: string;
  /** Exact retained owner, source, and capabilities of the excluding object. */
  readonly owner: QuireLayoutOwnerFacts;
  /** Explicit single or repeated occurrence of the excluding object. */
  readonly occurrence: QuireInlineFlowOccurrence;
  /** Coordinate-space-tagged exclusion rectangle. */
  readonly rect: QuireLayoutCoordinateRect;
  /** Stable dependencies that invalidate this exclusion geometry. */
  readonly dependencyIds: readonly string[];
}

/** Available inline interval compiled for one measured visual line. */
export interface QuireInlineFlowRegion {
  /** Stable region id derived from the owning line and interval order. */
  readonly id: string;
  /** Line whose available space produced this region. */
  readonly lineId: string;
  /** Concrete text-flow occurrence that owns this region. */
  readonly scopeId: string;
  /** Exact retained text-flow owner inherited from the line. */
  readonly owner: QuireLayoutOwnerFacts;
  /** Explicit text-flow occurrence inherited from the line. */
  readonly occurrence: QuireInlineFlowOccurrence;
  /** Coordinate-space-tagged available rectangle. */
  readonly rect: QuireLayoutCoordinateRect;
  /** Zero-based inline order within the line. */
  readonly order: number;
  /** Exclusions that changed this line's available intervals. */
  readonly appliedExclusionIds: readonly string[];
  /** Stable invalidation dependencies inherited from applied exclusions. */
  readonly dependencyIds: readonly string[];
}

/** Machine-readable failure reported while compiling inline flow regions. */
export interface QuireInlineFlowRegionGap {
  /** Stable gap classification. */
  readonly code:
    | "duplicate-line-id"
    | "duplicate-exclusion-id"
    | "invalid-identity"
    | "invalid-geometry"
    | "visual-instance-missing"
    | "visual-instance-mismatch"
    | "flow-scope-space-mismatch"
    | "missing-target-flow-scope";
  /** Product family that owns the invalid declaration. */
  readonly productKind: "line" | "exclusion";
  /** Id of the invalid declaration. */
  readonly productId: string;
  /** Human-readable diagnostic that does not invent fallback identity. */
  readonly message: string;
}

/** Input accepted by the internal inline flow-region compiler. */
export interface QuireInlineFlowRegionCompileInput {
  /** Measured lines in deterministic visual order. */
  readonly lines: readonly QuireInlineFlowLine[];
  /** Renderer-neutral exclusions in declaration order. */
  readonly exclusions: readonly QuireInlineFlowExclusion[];
}

/** Valid regions plus typed gaps from one compiler pass. */
export interface QuireInlineFlowRegionCompileResult {
  /** Available inline regions in line and inline order. */
  readonly regions: readonly QuireInlineFlowRegion[];
  /** Invalid declarations excluded from compilation. */
  readonly gaps: readonly QuireInlineFlowRegionGap[];
}
