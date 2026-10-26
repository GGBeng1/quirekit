import type { QuireEditor } from "@quirekit/core";
import type { FlowchartDocument, FlowchartEmbed, FlowchartEditRequest, FlowchartRasterSnapshot } from "@quirekit/flowchart";
/**
 * Renders a graph to a PNG offscreen, supplied by the host.
 * @param document - Graph to render.
 * @param editor - Owning editor.
 * @returns PNG bound to that exact graph.
 */
export type FlowchartRenderer = (document: FlowchartDocument, editor: QuireEditor) => Promise<FlowchartRasterSnapshot>;
/** Host-installed UI and rendering; semantic nodes do not import a framework or drawing runtime. */
export interface FlowchartOptions {
  /** @param request - Captured target. @param editor - Owning instance. @returns Disposable UI task. */
  readonly open: ((request: FlowchartEditRequest, editor: QuireEditor) => { close(): void }) | null;
  /** Offscreen renderer used by Agent edits; absent hosts cannot render for the Agent. */
  readonly render?: FlowchartRenderer | null | undefined;
}
/** Editor captured at creation for Agent command preparation. */
export interface FlowchartStorage {
  /** Owning editor while it exists. */ editor: QuireEditor | undefined;
}
/** Typed insertion intent. */
export interface FlowchartInsertion {
  /** Validated portable source. */ readonly document: FlowchartEmbed;
  /** Explicit mapped selection start, defaulting to current selection. */ readonly from?: number;
  /** Explicit mapped selection end. */ readonly to?: number;
}
/** Compare-and-swap edit intent. */
export interface FlowchartUpdate {
  /** Current mapped atom position. */ readonly position: number;
  /** Exact original JSON, preventing silent overwrite. */ readonly expected: string;
  /** Next source revision and its matching preview. */ readonly document: FlowchartEmbed;
}
