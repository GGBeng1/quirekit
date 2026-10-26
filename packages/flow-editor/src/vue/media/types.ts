import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowchartNode } from "@quirekit/flowchart";
/** Source-bound media task; no mutation while browsing. */
export interface FlowMediaRequest {
  /** Opening controller identity. */ readonly owner: FlowchartEditor;
  /** Opening content generation. */ readonly version: number;
  /** Initial chooser tab. */ readonly tab: "upload" | "icons";
  /** Captured replacement target, absent inserts a new node. */ readonly node?: FlowchartNode;
}
