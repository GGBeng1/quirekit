/** Unscaled world rectangle retained for one completed layout. */
export interface AnnotationBounds {
  /** Left edge. */ readonly x: number;
  /** Top edge. */ readonly y: number;
  /** Width. */ readonly width: number;
  /** Height. */ readonly height: number;
}

/** Visible topic geometry; full bounds include its visible owned descendants. */
export interface AnnotationTopicGeometry {
  /** Topic rectangle only. */ readonly node: AnnotationBounds;
  /** Subtree rectangle, excluding separately positioned forest roots. */ readonly subtree: AnnotationBounds;
  /** Preferred side for summary brackets. */ readonly side: "left" | "right";
}
