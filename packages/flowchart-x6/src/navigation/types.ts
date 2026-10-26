import type { FlowchartShape } from "@quirekit/flowchart";
/** World-coordinate rectangle independent of the editor's pan and zoom. */
export interface FlowchartWorldBounds {
  /** Left world position. */ readonly x: number;
  /** Top world position. */ readonly y: number;
  /** World width. */ readonly width: number;
  /** World height. */ readonly height: number;
}
/** One currently addressable text match. */
export interface FlowchartSearchHit {
  /** Graph-local identity, revalidated when located. */ readonly id: string;
  /** Display title, including an unnamed fallback. */ readonly title: string;
  /** Semantic silhouette. */ readonly shape: FlowchartShape;
  /** Short visible text excerpt including structured members. */ readonly preview: string;
}
/** Bounded search presentation; total remains truthful when the list is capped. */
export interface FlowchartSearchResult {
  /** All matching node count. */ readonly total: number;
  /** At most the requested result limit. */ readonly items: readonly FlowchartSearchHit[];
}
