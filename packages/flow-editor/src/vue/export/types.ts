import type { FlowchartDocument } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
/** Frozen content and selection captured by an explicit download intent. */
export interface FlowExportRequest {
  /** Original controller lifetime. */ readonly editor: FlowchartEditor;
  /** Full canonical opening source. */ readonly document: FlowchartDocument;
  /** Exact opening selection for optional fragment export. */ readonly ids: readonly string[];
  /** Content invalidation sequence. */ readonly version: number;
  /** Initial file choice from the toolbar. */ readonly format: "svg" | "png";
}
