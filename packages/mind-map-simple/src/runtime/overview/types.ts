/** Natural unscaled geometry independent of viewport translation. */
export interface MindMapBounds {
  /** World left. */ readonly x: number;
  /** World top. */ readonly y: number;
  /** Positive world width. */ readonly width: number;
  /** Positive world height. */ readonly height: number;
}

/** Small rendered topic silhouette with no text or source payload. */
export interface MindMapOverviewTopic extends MindMapBounds {
  /** Stable topic identity. */ readonly id: string;
  /** Main-root silhouette. */ readonly root: boolean;
}

/** One immutable visible-geometry index, reused for all viewport updates. */
export interface MindMapOverview {
  /** Layout generation; unrelated to host revision. */ readonly version: number;
  /** Whole rendered content range, including annotations. */ readonly bounds: MindMapBounds;
  /** Currently rendered topics, including free trees. */ readonly topics: readonly MindMapOverviewTopic[];
  /** Canvas width in CSS pixels at this geometry generation. */ readonly viewportWidth: number;
  /** Canvas height in CSS pixels at this geometry generation. */ readonly viewportHeight: number;
}
