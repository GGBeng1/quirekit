/** Point in canvas coordinate space. */
export interface QuirePoint {
  /** Horizontal coordinate in CSS pixels unless a caller documents otherwise. */
  readonly x: number;
  /** Vertical coordinate in CSS pixels unless a caller documents otherwise. */
  readonly y: number;
}

/** Size in canvas coordinate space. */
export interface QuireSize {
  /** Width in CSS pixels unless a caller documents otherwise. */
  readonly width: number;
  /** Height in CSS pixels unless a caller documents otherwise. */
  readonly height: number;
}

/** Rectangle in canvas coordinate space. */
export interface QuireRect extends QuirePoint, QuireSize {}

/** Two-dimensional affine transform in Canvas/SVG coefficient order. */
export interface QuireAffineTransform {
  /** Horizontal scale and x-axis rotation coefficient. */
  readonly a: number;
  /** Vertical skew and x-axis rotation coefficient. */
  readonly b: number;
  /** Horizontal skew and y-axis rotation coefficient. */
  readonly c: number;
  /** Vertical scale and y-axis rotation coefficient. */
  readonly d: number;
  /** Horizontal translation. */
  readonly e: number;
  /** Vertical translation. */
  readonly f: number;
}

/** Exact polygon used after a coarse rectangle target accepts a point. */
export interface QuirePolygonHitArea {
  /** Exact hit-area discriminator. */
  readonly kind: "polygon";
  /** Boundary-inclusive polygon vertices in target coordinate space. */
  readonly points: readonly QuirePoint[];
}

/** Exact geometry optionally attached to a coarse interaction target. */
export type QuireHitArea = QuirePolygonHitArea;
