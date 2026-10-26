import type { DataValue } from "@quirekit/data-view";

/** Cell-local navigation intent, independent of table order. */
export type CellDirection = "next" | "previous" | "up" | "down" | "left" | "right";
/** Complete cell value and requested focus direction. */
export interface CellMove {
  /** Requested neighboring position. */ readonly direction: CellDirection;
  /** Value the canonical source must acknowledge before focus moves. */ readonly value: DataValue;
}
