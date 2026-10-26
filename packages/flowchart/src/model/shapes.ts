import type { FlowchartShape } from "./types";

/** Complete v1 shape vocabulary, shared by admission and consumer catalogs. */
export const flowchartShapes = ["process", "terminator", "decision", "data", "document", "ellipse",
  "rectangle", "circle", "triangle", "hexagon", "cloud", "note", "subprocess", "database",
  "manual-input", "delay", "display", "off-page",
  "pentagon", "octagon", "trapezoid", "right-triangle", "star", "plus",
  "multi-document", "manual-operation", "stored-data", "internal-storage", "sort", "summing-junction", "or-junction", "merge",
  "arrow-right", "arrow-left", "arrow-up", "arrow-down", "arrow-horizontal", "arrow-vertical", "text", "callout",
  "uml-class", "er-entity", "group", "container", "lane-horizontal", "lane-vertical", "lifeline", "activation",
  "actor", "server", "browser", "mobile", "component", "package", "queue",
  "bracket-left", "bracket-right", "brace", "actor-lifeline", "destruction",
  "sequence-alt", "sequence-opt", "sequence-loop", "phase-horizontal", "phase-vertical", "image"] as const satisfies readonly FlowchartShape[];
