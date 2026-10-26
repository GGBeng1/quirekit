import type { RouteBox } from "../routes/types";
import type { FlowchartPoint } from "@quirekit/flowchart";

/** One bounded candidate for a label on a rendered world path. */
export interface LabelPlacement {
  /** Fraction of path length. */ readonly distance: number;
  /** Normal offset, or an explicit world offset. */ readonly offset: number | FlowchartPoint;
  /** Conservative label paint bounds. */ readonly box: RouteBox;
}
/** Spatial query for fixed obstacles and labels already placed. */
export interface LabelObstacles {
  /** @param box - New conservative world obstacle. */ add(box: RouteBox): void;
  /** @param box - Candidate. @returns Total overlapping area, counting each obstacle once. */ overlap(box: RouteBox): number;
}
