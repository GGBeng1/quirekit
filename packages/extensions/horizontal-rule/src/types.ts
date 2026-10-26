/** Visual families supported by the Word-compatible horizontal rule. */
export type HorizontalRuleVariant =
  | "single"
  | "double"
  | "dotted"
  | "dashed"
  | "shaded";

/** Inline alignment used when a rule occupies less than the available width. */
export type HorizontalRuleAlignment = "left" | "center" | "right";

/** Canonical persisted style for one horizontal rule node. */
export interface HorizontalRuleStyle {
  /** Visual line family. */
  readonly variant: HorizontalRuleVariant;
  /** CSS-compatible hexadecimal line color. */
  readonly color: string;
  /** Total visual thickness in typographic points. */
  readonly thicknessPt: number;
  /** Percentage of the available paragraph width occupied by the rule. */
  readonly widthPercent: number;
  /** Alignment inside the available paragraph width. */
  readonly alignment: HorizontalRuleAlignment;
}

/** Partial style accepted by insertion and update commands. */
export type HorizontalRuleStyleInput = Partial<HorizontalRuleStyle>;

/** Stable built-in rule preset exposed to product surfaces. */
export interface HorizontalRulePreset {
  /** Stable preset id suitable for persistence and UI keys. */
  readonly id: string;
  /** Localizable fallback label. */
  readonly label: string;
  /** Complete atomic rule style applied by the preset. */
  readonly style: HorizontalRuleStyle;
}

/** Options for the horizontal rule node extension. */
export interface HorizontalRuleOptions {
  /** HTML attributes added when the horizontal rule serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
  /** Default block node type inserted after a trailing horizontal rule. */
  readonly nextNodeType: string;
  /** Canonical style used when imported or inserted content omits attributes. */
  readonly defaultStyle: HorizontalRuleStyle;
}
