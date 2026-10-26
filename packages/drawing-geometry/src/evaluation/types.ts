import type { DrawingPathFill } from "../presets/types";

/** Finite point in a local drawing coordinate system. */
export interface DrawingGeometryPoint {
  /** Horizontal coordinate. */
  readonly x: number;
  /** Vertical coordinate. */
  readonly y: number;
}
/** Portable numeric path operations accepted by both paint backends. */
export type DrawingGeometrySegment =
  | { readonly kind: "move-to" | "line-to"; readonly point: DrawingGeometryPoint }
  | { readonly kind: "quadratic-curve-to"; readonly control: DrawingGeometryPoint; readonly point: DrawingGeometryPoint }
  | { readonly kind: "bezier-curve-to"; readonly control1: DrawingGeometryPoint; readonly control2: DrawingGeometryPoint; readonly point: DrawingGeometryPoint }
  | { readonly kind: "close-path" };
/** One resolved path, before object rotation and reflection. */
export interface ResolvedDrawingPath {
  /** Local horizontal coordinate extent. */
  readonly width: number;
  /** Local vertical coordinate extent. */
  readonly height: number;
  /** Whether the path has a fill. */
  readonly fill: boolean;
  /** Standard tonal treatment of the shape fill. */
  readonly fillMode: DrawingPathFill;
  /** Whether the path has a stroke. */
  readonly stroke: boolean;
  /** Fully numeric, ordered path commands. */
  readonly segments: readonly DrawingGeometrySegment[];
}
/** Geometry result relative to the requested frame. */
export interface ResolvedDrawingGeometry {
  /** Ordered paths in their own declared coordinate systems. */
  readonly paths: readonly ResolvedDrawingPath[];
  /** Normalized text rectangle, before authored body insets. */
  readonly textRect: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };
}
