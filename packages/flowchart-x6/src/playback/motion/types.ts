import type { FlowchartMotionEffect } from "@quirekit/flowchart";

/** One compiled actor lifetime, with cached geometry and a logical-time projection. */
export interface MotionActor {
  /** Owning detached SVG object, absent for source visibility. */ readonly element?: SVGElement;
  /** Validated effect and timing. */ readonly effect: FlowchartMotionEffect;
  /** @param progress - Current step fraction. @param duration - Current logical step length. @param reduced - Show completed poses without movement. */ frame(progress: number, duration: number, reduced: boolean): void;
}
/** Cached point in the authored world-coordinate path. */
export interface MotionPoint {
  /** World CSS px abscissa. */ readonly x: number;
  /** World CSS px ordinate. */ readonly y: number;
}
