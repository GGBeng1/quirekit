import type { drawingPresetNames } from "./names";

/** Standard DrawingML preset identity. */
export type DrawingPresetName = typeof drawingPresetNames[number];
/** Ordered name/formula pair evaluated in the shape frame. */
export type DrawingGuide = readonly [name: string, formula: string];
/** Standard per-path fill transformation. */
export type DrawingPathFill = "norm" | "none" | "darken" | "darkenLess" | "lighten" | "lightenLess";
/** Formula-valued path operations; coordinates reference earlier guides. */
export type PresetPathOperation =
  | readonly ["M" | "L", string, string]
  | readonly ["Q" | "A", string, string, string, string]
  | readonly ["C", string, string, string, string, string, string]
  | readonly ["Z"];
/** One independent path in a declarative preset. */
export interface PresetPath {
  /** Explicit path width, or the shape width. */
  readonly width: string | null;
  /** Explicit path height, or the shape height. */
  readonly height: string | null;
  /** Per-path fill transformation. */
  readonly fill: DrawingPathFill;
  /** Whether the authored shape stroke applies. */
  readonly stroke: boolean;
  /** Ordered path instructions. */
  readonly commands: readonly PresetPathOperation[];
}
/** Immutable geometry program from the pinned standard data. */
export interface PresetDefinition {
  /** Standard local adjustment handles, in declaration order. */
  readonly handles: readonly PresetAdjustmentHandle[];
  /** Defaults overridden only by matching explicit adjustment names. */
  readonly adjustments: readonly DrawingGuide[];
  /** Ordered derived values. */
  readonly guides: readonly DrawingGuide[];
  /** Left/top/right/bottom expressions for the text frame. */
  readonly textRect: readonly [string, string, string, string];
  /** Ordered paint paths, including holes and tonal overlays. */
  readonly paths: readonly PresetPath[];
}

/** One formula-valued adjustment axis. */
export interface PresetAdjustmentAxis {
  /** Name of the adjustable value. */
  readonly guide: string;
  /** Minimum expression in the current guide environment. */
  readonly min: string;
  /** Maximum expression in the current guide environment. */
  readonly max: string;
}

/** Portable handle declaration from DrawingML ahLst. */
export interface PresetAdjustmentHandle {
  /** Cartesian or polar coordinate family. */
  readonly kind: "xy" | "polar";
  /** Local horizontal and vertical position expressions. */
  readonly position: readonly [string, string];
  /** Horizontal adjustment, when present. */
  readonly x?: PresetAdjustmentAxis;
  /** Vertical adjustment, when present. */
  readonly y?: PresetAdjustmentAxis;
  /** Radial adjustment, when present. */
  readonly radius?: PresetAdjustmentAxis;
  /** Angular adjustment, when present. */
  readonly angle?: PresetAdjustmentAxis;
}
