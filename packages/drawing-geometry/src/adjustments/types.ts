import type { DrawingGeometryPoint } from "../evaluation/types";
import type { DrawingPresetName } from "../presets/types";

/** A resolved adjustment value and its current legal interval. */
export interface DrawingAdjustmentAxis {
  /** Source guide name changed by this axis. */
  readonly guide: string;
  /** Current source value, including the standard default. */
  readonly value: number;
  /** Evaluated inclusive minimum. */
  readonly min: number;
  /** Evaluated inclusive maximum. */
  readonly max: number;
}

/** Evaluated local control point; never persisted in the document. */
export interface DrawingAdjustmentHandle {
  /** Stable index in the preset's handle declarations. */
  readonly index: number;
  /** Cartesian or polar coordinate family. */
  readonly kind: "xy" | "polar";
  /** Local point before reflection and rotation. */
  readonly position: DrawingGeometryPoint;
  /** Optional horizontal source axis. */
  readonly x?: DrawingAdjustmentAxis;
  /** Optional vertical source axis. */
  readonly y?: DrawingAdjustmentAxis;
  /** Optional radial source axis. */
  readonly radius?: DrawingAdjustmentAxis;
  /** Optional angular source axis. */
  readonly angle?: DrawingAdjustmentAxis;
}

/** Input to a bounded, source-independent adjustment solve. */
export interface DrawingAdjustmentRequest {
  /** Standard shape identity. */
  readonly preset: DrawingPresetName;
  /** Positive local width. */
  readonly width: number;
  /** Positive local height. */
  readonly height: number;
  /** Authored values captured at pointer down. */
  readonly adjustments: Readonly<Record<string, number>>;
  /** Exact declaration index selected by hit testing. */
  readonly handle: number;
  /** Desired handle point in untransformed local coordinates. */
  readonly point: DrawingGeometryPoint;
}
