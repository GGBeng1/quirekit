import type { FlowchartPoint } from "@quirekit/flowchart";

/** Axis-aligned obstacle in graph world coordinates. */
export interface RouteBox extends FlowchartPoint {
  /** Horizontal extent. */ readonly width: number;
  /** Vertical extent. */ readonly height: number;
}
