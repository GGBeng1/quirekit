import type { FlowchartPageSettings } from "@quirekit/flowchart";
/** Event payload owned exclusively by this adapter. */
export interface PageHistoryEvent {
  /** Prior optional root metadata. */ readonly before: FlowchartPageSettings | undefined;
  /** Next optional root metadata. */ readonly after: FlowchartPageSettings | undefined;
}
