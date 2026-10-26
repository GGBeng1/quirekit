/** Explicit geometry fields; omitted values preserve each target's current value. */
export interface FlowchartGeometryPatch {
  /** Canonical world left coordinate. */ readonly x?: number;
  /** Canonical world top coordinate. */ readonly y?: number;
  /** Unrotated local width in CSS pixels. */ readonly width?: number;
  /** Unrotated local height in CSS pixels. */ readonly height?: number;
  /** Clockwise degrees in [0,360). */ readonly rotation?: number;
}
/** A property supported by the exact geometry editor. */
export type FlowchartGeometryField = keyof FlowchartGeometryPatch;
