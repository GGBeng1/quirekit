import type { FlowchartConnector, FlowchartCrossing, FlowchartEdgeStyle, FlowchartNodeStyle, FlowchartEdge } from "../model/types";
/** Canonical presentation copied within an authoring session, never persisted as document content. */
export type FlowchartFormat = {
  /** Compatible target family. */ readonly kind: "node";
  /** Complete style, with absent fields following the workspace theme. */ readonly style: FlowchartNodeStyle;
} | {
  /** Compatible target family. */ readonly kind: "edge";
  /** Complete edge style. */ readonly style: FlowchartEdgeStyle;
  /** Path routing appearance, excluding manual bends. */ readonly routing: FlowchartEdge["routing"];
  /** Corner/curve appearance. */ readonly connector?: FlowchartConnector;
  /** Crossing appearance. */ readonly crossing?: FlowchartCrossing;
};
