import type { FlowchartDocument, FlowchartPlaybackTrace } from "@quirekit/flowchart";
/** An illustrative graph and explicit teaching sequence, independent of a real algorithm observer. */
export interface FlowchartPlaybackExample {
  /** Canonical editable graph with stable target identities. */ readonly document: FlowchartDocument;
  /** Explicit sample events; never presented as actual parser telemetry. */ readonly trace: FlowchartPlaybackTrace;
}
