import type { QuireMountedTableChromeAnchor } from "@quirekit/core";

/** One real, contiguous segment of a physical resize boundary. */
export interface ResizeHitSegment {
  /** Inclusive cross-axis start in viewport CSS pixels. */
  readonly start: number;
  /** Inclusive cross-axis end in viewport CSS pixels. */
  readonly end: number;
  /** Unmodified mounted View anchor owning this segment. */
  readonly anchor: QuireMountedTableChromeAnchor;
}

/** Sorted physical boundary and its sorted non-overlapping segments. */
export interface ResizeHitBoundary {
  /** Primary-axis position in viewport CSS pixels. */
  readonly coordinate: number;
  /** Only physically present segments; merged-cell gaps remain absent. */
  readonly segments: ResizeHitSegment[];
}
