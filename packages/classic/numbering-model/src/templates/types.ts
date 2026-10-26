import type {
  WordParagraphMeasurement
} from "@quirekit/classic-paragraph-model";
import type {
  WordAbstractNumbering,
  WordParagraphNumbering,
  WordNumberingFormat,
  WordNumberingJustification,
  WordNumberingMarkerFontHint,
  WordNumberingMarkerThemeFont,
  WordNumberingSuffix
} from "../types";

/** Explicit restart value used by a friendly numbering-template draft. */
export type WordNumberingTemplateRestartRule =
  | number
  | null
  | "default";

/** Partial logical indentation merged over one numbering level. */
export interface WordNumberingTemplateIndentationOverride {
  /** Logical start inset, null to inherit zero, or omitted to keep the base. */
  readonly start?: WordParagraphMeasurement | null | undefined;
  /** Logical end inset, null to inherit zero, or omitted to keep the base. */
  readonly end?: WordParagraphMeasurement | null | undefined;
  /** Signed first-line delta, null to inherit zero, or omitted to keep the base. */
  readonly firstLine?: WordParagraphMeasurement | null | undefined;
}

/** Partial marker font slots merged over one numbering level. */
export interface WordNumberingTemplateMarkerFontsOverride {
  /** Latin ASCII family, null to clear, or omitted to keep the base. */
  readonly ascii?: string | null | undefined;
  /** High ANSI family, null to clear, or omitted to keep the base. */
  readonly highAnsi?: string | null | undefined;
  /** East Asian family, null to clear, or omitted to keep the base. */
  readonly eastAsia?: string | null | undefined;
  /** Complex-script family, null to clear, or omitted to keep the base. */
  readonly complexScript?: string | null | undefined;
  /** ASCII theme reference, null to clear, or omitted to keep the base. */
  readonly asciiTheme?: WordNumberingMarkerThemeFont | null | undefined;
  /** High-ANSI theme reference, null to clear, or omitted to keep the base. */
  readonly highAnsiTheme?: WordNumberingMarkerThemeFont | null | undefined;
  /** East Asian theme reference, null to clear, or omitted to keep the base. */
  readonly eastAsiaTheme?: WordNumberingMarkerThemeFont | null | undefined;
  /** Complex-script theme reference, null to clear, or omitted to keep the base. */
  readonly complexScriptTheme?: WordNumberingMarkerThemeFont | null | undefined;
  /** OOXML character-slot hint, null to clear, or omitted to keep the base. */
  readonly hint?: WordNumberingMarkerFontHint | null | undefined;
}

/** Partial marker language slots merged over one numbering level. */
export interface WordNumberingTemplateLanguageOverride {
  /** General language tag, null to clear, or omitted to keep the base. */
  readonly value?: string | null | undefined;
  /** East Asian language tag, null to clear, or omitted to keep the base. */
  readonly eastAsia?: string | null | undefined;
  /** Bidirectional language tag, null to clear, or omitted to keep the base. */
  readonly bidi?: string | null | undefined;
}

/** Partial marker typography merged over one numbering level. */
export interface WordNumberingTemplateMarkerStyleOverride {
  /** Marker font slots, null to clear all slots, or omitted to keep the base. */
  readonly fonts?: WordNumberingTemplateMarkerFontsOverride | null | undefined;
  /** Marker language slots, null to clear all slots, or omitted to keep the base. */
  readonly language?: WordNumberingTemplateLanguageOverride | null | undefined;
  /** Marker size in points, null to clear, or omitted to keep the base. */
  readonly fontSizePt?: number | null | undefined;
  /** Complex-script marker size in points, null to clear, or omitted to keep the base. */
  readonly complexScriptFontSizePt?: number | null | undefined;
  /** Bold override, null to clear, or omitted to keep the base. */
  readonly bold?: boolean | null | undefined;
  /** Complex-script bold override, null to clear, or omitted to keep the base. */
  readonly complexScriptBold?: boolean | null | undefined;
  /** Italic override, null to clear, or omitted to keep the base. */
  readonly italic?: boolean | null | undefined;
  /** Complex-script italic override, null to clear, or omitted to keep the base. */
  readonly complexScriptItalic?: boolean | null | undefined;
  /** RGB marker color, `auto`, null to clear, or omitted to keep the base. */
  readonly color?: string | null | undefined;
  /** Underline override, null to clear, or omitted to keep the base. */
  readonly underline?: boolean | null | undefined;
  /** Strike override, null to clear, or omitted to keep the base. */
  readonly strike?: boolean | null | undefined;
}

/** Friendly partial fields that may override one semantic numbering level. */
export interface WordNumberingTemplateLevelOverride {
  /** Counter or literal-bullet format override. */
  readonly format?: WordNumberingFormat | undefined;
  /** Office 2010 custom expression, null to clear, or omitted to keep the base. */
  readonly customFormat?: string | null | undefined;
  /** Marker text or `%1`–`%9` template override. */
  readonly text?: string | undefined;
  /** Positive first counter value override. */
  readonly start?: number | undefined;
  /** Ancestor restart, null for never, `default` for OOXML default, or omission to inherit. */
  readonly restartAfterLevel?: WordNumberingTemplateRestartRule | undefined;
  /** Marker-to-text separator override. */
  readonly suffix?: WordNumberingSuffix | undefined;
  /** Logical marker alignment override. */
  readonly justification?: WordNumberingJustification | undefined;
  /** Partial paragraph indentation override. */
  readonly paragraphIndentation?: WordNumberingTemplateIndentationOverride | undefined;
  /** Marker-only typography, null to clear, or omission to inherit. */
  readonly markerStyle?: WordNumberingTemplateMarkerStyleOverride | null | undefined;
}

/** One indexed level override in a partial multilevel template. */
export interface WordNumberingTemplateIndexedLevelOverride
  extends WordNumberingTemplateLevelOverride {
  /** Zero-based destination level from zero through eight. */
  readonly level: number;
}

/** Friendly draft for one portable current-level numbering preset. */
export interface WordNumberingSingleLevelTemplateDraft {
  /** Discriminant selecting portable current-level compilation. */
  readonly scope: "singleLevel";
  /** Globally stable id assigned to the compiled preset. */
  readonly id: string;
  /** Stable id of a compatible single-level base preset. */
  readonly basePresetId: string;
  /** Partial level fields merged over the base tuple. */
  readonly level: WordNumberingTemplateLevelOverride;
}

/** Friendly draft for one complete nine-level numbering definition. */
export interface WordNumberingMultilevelTemplateDraft {
  /** Discriminant selecting complete-definition compilation. */
  readonly scope: "multilevel";
  /** Globally stable id assigned to the compiled preset. */
  readonly id: string;
  /** Stable id of a compatible complete multilevel base preset. */
  readonly basePresetId: string;
  /** Strictly ascending explicit level overrides; omitted levels keep the base. */
  readonly levels: readonly WordNumberingTemplateIndexedLevelOverride[];
}

/** Public friendly numbering template accepted by the semantic compiler. */
export type WordNumberingTemplateDraft =
  | WordNumberingSingleLevelTemplateDraft
  | WordNumberingMultilevelTemplateDraft;

/** Options accepted by the explicit numbering-template application command. */
export interface ApplyWordNumberingTemplateOptions {
  /** Friendly partial template compiled and applied in one command transaction. */
  readonly draft: WordNumberingTemplateDraft;
}

/** Snapshot used to edit an existing document definition without changing its scope. */
export interface WordNumberingEditTarget {
  /** Position of the first selected list paragraph. */
  readonly position: number;
  /** Captured concrete reference, also used for freshness validation. */
  readonly reference: WordParagraphNumbering;
  /** Complete captured definition; unexposed fields remain authoritative. */
  readonly definition: WordAbstractNumbering;
}

/** Atomic changes to a real concrete list definition. */
export interface UpdateWordNumberingDefinitionOptions {
  /** Snapshot obtained when the editing surface opens. */
  readonly target: WordNumberingEditTarget;
  /** Unique existing levels and explicitly edited fields. */
  readonly levels: readonly WordNumberingTemplateIndexedLevelOverride[];
  /** Optional occurrence restart edit on the captured paragraph. */
  readonly startOverride?: number | null | undefined;
}
