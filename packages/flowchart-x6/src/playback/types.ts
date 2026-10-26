import type { FlowchartRunState } from "@quirekit/flowchart";
/** Optional semantic colors; omitted states retain the adapter's neutral theme. */
export type FlowchartRunColors = Readonly<Record<FlowchartRunState, string>>;
/** One sparse SVG presentation owned by this editor, never by its source cells. */
export interface RunOverlay {
  /** Transient world-coordinate group outside the graph model and content bounds. */ readonly element: SVGGElement;
  /** Running connector whose dash phase may change each frame. */ readonly flow?: SVGPathElement;
}

/** One target-owned SVG element, captured only at a semantic scene boundary. */
export interface PlaybackTargetElement {
  /** Current diagram identity. */ readonly id: string;
  /** State or cue geometry independent of its source cell. */ readonly element: SVGElement;
}
