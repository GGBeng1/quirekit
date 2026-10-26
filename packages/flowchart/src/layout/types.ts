import type { FlowchartNode } from "../model/types";
/** Explicit layout direction, independent of any graph vendor. */
export type FlowchartLayout = "layout-down" | "layout-right";
/** Resolved same-owner layout input in world coordinates. */
export interface LayoutScope {
  /** Nodes being ranked, including pinned roots. */ readonly roots: readonly FlowchartNode[];
  /** Direct owner when laying out its children. */ readonly owner?: FlowchartNode;
  /** Stable roots which must not move. */ readonly pinned: ReadonlySet<string>;
  /** Unselected sibling obstacles. */ readonly obstacles: readonly FlowchartNode[];
  /** Maps every descendant to its candidate layout root. */ readonly membership: ReadonlyMap<string, string>;
}
