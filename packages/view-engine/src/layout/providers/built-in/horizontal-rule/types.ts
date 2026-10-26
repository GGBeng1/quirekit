/** Visual families understood by the built-in horizontal-rule projection. */
export type BuiltInHorizontalRuleVariant =
  | "single"
  | "double"
  | "dotted"
  | "dashed"
  | "shaded";

/** Inline alignment understood by the built-in horizontal-rule projection. */
export type BuiltInHorizontalRuleAlignment = "left" | "center" | "right";

/** Validated visual style consumed by built-in rule geometry and paint. */
export interface BuiltInHorizontalRuleStyle {
  /** Visual line family. */
  readonly variant: BuiltInHorizontalRuleVariant;
  /** CSS-compatible stroke or fill color. */
  readonly color: string;
  /** Total visible thickness in typographic points. */
  readonly thicknessPt: number;
  /** Percentage of the available inline size occupied by the rule. */
  readonly widthPercent: number;
  /** Alignment inside the available inline size. */
  readonly alignment: BuiltInHorizontalRuleAlignment;
}
