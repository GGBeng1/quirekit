import type { FlowchartRunState } from "../types";

/** Shared timing in the current logical step; effects can overlap. */
export interface FlowchartMotionTiming {
  /** Canonical target identity; flow and travel require a connector. */ readonly id: string;
  /** Start offset in milliseconds; defaults to zero. */ readonly delay?: number;
  /** Effect length within the step; defaults to its remaining duration. */ readonly duration?: number;
  /** Linear movement or smooth acceleration/deceleration. */ readonly easing?: "linear" | "ease-in-out";
  /** Semantic color, projected by the current theme. */ readonly tone?: FlowchartRunState;
}
/** Continuous, evenly spaced flow on an existing connector for the cue's active interval. */
export interface FlowchartFlowEffect extends FlowchartMotionTiming {
  /** Repeats a path pattern on the shared logical clock. */ readonly kind: "flow";
  /** Fine dashes, sparse short beams or small dots; defaults to dash. */ readonly style?: "dash" | "beam" | "dot";
  /** Pattern distance per second in authored world CSS px, 12–240; defaults to 48. */ readonly speed?: number;
  /** Reverse flow without changing the authored arrow; defaults to forward. */ readonly direction?: "forward" | "reverse";
}
/** Content-bearing objects following a real connector. */
export interface FlowchartTravelEffect extends FlowchartMotionTiming {
  /** Move along the connector's arc length. */ readonly kind: "travel";
  /** Dot, short path beam, text token, or a miniature vector; defaults to dot. */ readonly payload?: "dot" | "beam" | "token" | "vector";
  /** Plain payload caption, at most 80 characters. */ readonly label?: string;
  /** Staggered moving objects, 1–16; defaults to one. */ readonly count?: number;
  /** Reverse traversal without changing the authored arrow. */ readonly direction?: "forward" | "reverse";
  /** Normalized illustrative vector components, 2–16 finite values in [-1,1]. */ readonly values?: readonly number[];
}
/** Temporary emphasis on a source contour, without a selection frame. */
export interface FlowchartPulseEffect extends FlowchartMotionTiming {
  /** Soft breathing emphasis. */ readonly kind: "pulse";
  /** Expanding contour rings for a node instead of a filled pulse; defaults to false. */ readonly halo?: boolean;
}
/** Gradually reveals a source object initially listed in trace.hidden. */
export interface FlowchartAppearEffect extends FlowchartMotionTiming {
  /** Fade to the authored appearance. */ readonly kind: "appear";
}
/** Portable step choreography, independent of vendor animation objects. */
export type FlowchartMotionEffect = FlowchartFlowEffect | FlowchartTravelEffect | FlowchartPulseEffect | FlowchartAppearEffect;
/** Renderer work at one semantic boundary; never a per-frame notification. */
export interface FlowchartMotionPatch {
  /** Status decoration or data-animation presentation. */ readonly presentation: "status" | "motion";
  /** Initial visibility baseline on reset, otherwise absent. */ readonly hidden?: readonly string[];
  /** Targets that reached an appear step in the applied prefix. */ readonly revealed: readonly string[];
  /** Choreography for just the current step. */ readonly effects: readonly FlowchartMotionEffect[];
}
