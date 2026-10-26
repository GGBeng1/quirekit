import type { FlowchartShape } from "../model/types";
/** World-space direction for a newly connected node. */
export type FlowchartDirection = "right" | "down" | "left" | "up";
/** A bounded creation intent; ownership comes from the existing source node. */
export interface FlowchartQuickCreate {
  /** Direction independent of the source's rotation and mirror. */ readonly direction: FlowchartDirection;
  /** Ordinary shape, or the current source kind and dimensions. */ readonly shape: FlowchartShape | "same";
}
