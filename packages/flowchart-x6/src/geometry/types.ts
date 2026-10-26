import type { FlowchartPoint, FlowchartPort } from "@quirekit/flowchart";

/** Precise node-local geometry, shared by hit testing and visual strokes. */
export interface ShapeGeometry {
  /** Closed outline path in local CSS pixels. */ readonly outline: string;
  /** Open decorative paths, such as a cylinder rim or folded corner. */ readonly detail: string;
  /** Optional narrow hit path for open strokes, never exported visibly. */ readonly hitPath?: string;
  /** Safe caption width in local pixels. */ readonly textWidth: number;
  /** Safe caption height in local pixels. */ readonly textHeight: number;
  /** Horizontal caption center in local pixels. */ readonly textX: number;
  /** Whether the contour is visible, rather than a transparent text hit area. */ readonly visible: boolean;
  /** Vertical caption center in local pixels. */ readonly textY: number;
  /** Exact cardinal attachments on the visible contour. */ readonly ports: Readonly<Record<FlowchartPort, FlowchartPoint>>;
}

/** Caption inset and anchors in node-local world pixels. */
export interface CaptionLayout {
  /** Safe left inset. */ readonly left: number;
  /** Safe top inset. */ readonly top: number;
  /** Positive usable width. */ readonly width: number;
  /** Positive usable height. */ readonly height: number;
  /** Horizontal SVG anchor coordinate. */ readonly x: number;
  /** Vertical SVG anchor coordinate. */ readonly y: number;
  /** SVG horizontal anchoring. */ readonly anchor: "start" | "middle" | "end";
  /** SVG vertical anchoring. */ readonly verticalAnchor: "top" | "middle" | "bottom";
}
