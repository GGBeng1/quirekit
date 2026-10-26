import type { FlowchartNode } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
/** Source owner captured before opening a local text draft. */
export interface FlowTextRequest {
  /** Controller identity. */ readonly owner: FlowchartEditor;
  /** Content invalidation version. */ readonly version: number;
  /** Complete node snapshot. */ readonly node: FlowchartNode;
}
