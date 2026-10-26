/** Directional bias used when mapping coordinates to document positions. */
export type QuireDocumentPositionBias = -1 | 0 | 1;

/** Position in the ProseMirror document coordinate space. */
export interface QuireDocumentPosition {
  /** ProseMirror document position. */
  readonly pos: number;
  /** Directional bias for ambiguous positions such as line boundaries. */
  readonly bias?: QuireDocumentPositionBias;
}

/** Range in the ProseMirror document coordinate space. */
export interface QuireDocumentRange {
  /** Inclusive start document position. */
  readonly from: number;
  /** Exclusive end document position. */
  readonly to: number;
}
