import type { WordListKind, WordNumberingLevel } from "../types";

/** One resolved sample line for a list-preset gallery. */
export interface WordNumberingPreviewLine {
  /** Marker derived by the canonical formatter. */
  readonly marker: string;
  /** Presentation-only nesting depth. */
  readonly depth: number;
  /** Effective tuple for richer previews. */
  readonly definition?: WordNumberingLevel | undefined;
}
/** Schema-owned preset projection shared by editor products. */
export interface WordNumberingGalleryTile {
  /** Canonical preset identity. */
  readonly presetId: string;
  /** Gallery family. */
  readonly kind: "ordered" | "bullet";
  /** Canonical preset scope. */
  readonly scope: "singleLevel" | "multilevel";
  /** Resolved sample lines. */
  readonly lines: readonly WordNumberingPreviewLine[];
}

/** One portable single-level tuple before it is mapped to a document level. */
export type WordNumberingSingleLevelPreset = Omit<
  WordNumberingLevel,
  "level" | "restartAfterLevel"
> & {
  /** Default previous-level restart or `null` for never restart. */
  readonly restartAfterLevel?: null | undefined;
};

/** Shared fields carried by every semantic Word numbering preset. */
export interface WordNumberingPresetContributionBase {
  /** Globally unique stable preset id used by commands and product behaviors. */
  readonly id: string;
  /** Canonical list family created by the preset. */
  readonly kind: WordListKind;
}

/** One portable level that maps onto the active level when applied. */
export interface WordNumberingSingleLevelPresetContribution
  extends WordNumberingPresetContributionBase {
  /** Discriminant selecting current-level application. */
  readonly scope: "singleLevel";
  /** Complete canonical tuple without a fixed destination level. */
  readonly level: WordNumberingSingleLevelPreset;
}

/** One complete nine-level Word numbering definition. */
export interface WordNumberingMultilevelPresetContribution
  extends WordNumberingPresetContributionBase {
  /** Discriminant selecting complete-definition application. */
  readonly scope: "multilevel";
  /** Complete levels zero through eight keyed by canonical index. */
  readonly levels: Readonly<Record<string, WordNumberingLevel>>;
}

/** Semantic numbering preset contributed by an ordinary QuireKit extension. */
export type WordNumberingPresetContribution =
  | WordNumberingSingleLevelPresetContribution
  | WordNumberingMultilevelPresetContribution;

/** Options accepted by the explicit numbering-preset application command. */
export interface ApplyWordNumberingPresetOptions {
  /** Stable semantic preset id resolved from the editor extension set. */
  readonly presetId: string;
}

/** Immutable preset registry resolved from one editor extension set. */
export interface WordNumberingPresetRegistry {
  /** Presets in deterministic extension declaration order. */
  readonly presets: readonly WordNumberingPresetContribution[];

  /**
   * Resolves one semantic preset by stable id.
   *
   * @param id - Stable preset id.
   * @returns Matching immutable preset, or undefined.
   */
  get(id: string): WordNumberingPresetContribution | undefined;
}
