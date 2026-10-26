/** Stable whole-document palette identity, independent of content templates. */
export type MindMapThemeId = "blue" | "slate" | "ink" | "coral" | "ocean" | "forest" | "amber" | "violet" | "spectrum";
/** Headless catalog metadata; names are localized by consumers. */
export interface MindMapTheme {
  /** Stable palette key. */ readonly id: MindMapThemeId;
  /** Original document colors for a lightweight preview. */ readonly colors: readonly string[];
}
