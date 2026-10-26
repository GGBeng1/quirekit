import type { FlowchartDocument } from "@quirekit/flowchart";
/** Adapter-owned whole-source history payload. */
export interface FlowReplacementEvent {
  /** Immutable source before the explicit replacement. */ readonly before: FlowchartDocument;
  /** Immutable source after the explicit replacement. */ readonly after: FlowchartDocument;
}
