import type { FlowchartNode } from "@quirekit/flowchart";

/** Fixed world-coordinate extent of every accepted scene in a recorded run. */
export interface SceneBounds {
  /** Left world edge. */ readonly x: number;
  /** Top world edge. */ readonly y: number;
  /** Positive world width. */ readonly width: number;
  /** Positive world height. */ readonly height: number;
}

/** Cached transient pose, composed outside ordinary cue opacity. */
export interface SceneActor {
  /** Accepted or retiring object identity. */ readonly id: string;
  /** State/cue wrappers composed with this pose at a semantic boundary. */ readonly decorations: SceneDecoration[];
  /** Wrapper for a live SVG view, or a detached retiring view. */ readonly element: SVGGElement;
  /** Live view returned to its original parent when the transition settles. */ readonly content?: Element;
  /** Whether this actor is a retiring visual. */ readonly retiring: boolean;
  /** Whether a new or changed caption fades into view. */ readonly entering: boolean;
  /** Previous world rectangle; absent for new objects or connector crossfades. */ readonly before?: FlowchartNode;
  /** Accepted world rectangle; absent for retired objects or connectors. */ readonly after?: FlowchartNode;
}

/** Independent outer pose for a state or cue element; inner cue animation remains authoritative. */
export interface SceneDecoration {
  /** Owned world-coordinate pose wrapper. */ readonly element: SVGGElement;
  /** Existing state/cue element restored on settling. */ readonly content: SVGElement;
}
