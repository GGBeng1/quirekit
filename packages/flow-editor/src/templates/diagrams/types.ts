import type { FlowchartEdge } from "@quirekit/flowchart";
/** Authored connection properties, with identity and attachments supplied separately. */
export type DiagramConnection = Partial<Pick<FlowchartEdge, "routing" | "connector" | "vertices" | "label" | "labelPosition" | "style">>;
