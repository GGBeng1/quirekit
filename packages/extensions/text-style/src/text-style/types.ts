/** TextStyle-owned field admitted to one exact collective update. */
export type TextStyleField =
  | "characterGrid"
  | "bold"
  | "fontFamily"
  | "fontFamilyLatin"
  | "fontFamilyEastAsia"
  | "fontFamilyComplexScript"
  | "fontSize"
  | "fontSizeComplexScript"
  | "color"
  | "backgroundColor"
  | "letterSpacing"
  | "textScale"
  | "allCaps"
  | "smallCaps"
  | "boldCs"
  | "italicCs"
  | "rightToLeft"
  | "hidden"
  | "outline"
  | "shadow"
  | "emboss"
  | "imprint"
  | "emphasisMark"
  | "languageLatin"
  | "languageEastAsia"
  | "languageComplexScript";

/** Canonical value admitted by one TextStyle field update. */
export type TextStyleFieldValue = boolean | string | number | null;

/** Immutable exact range resolved by a document-aware caller. */
export interface TextStyleExactRange {
  /** Inclusive canonical document position. */
  readonly from: number;
  /** Exclusive canonical document position. */
  readonly to: number;
  /** Exact selected text at the baseline revision. */
  readonly expectedText: string;
  /** Revision-bound opaque semantic range id. */
  readonly id: string;
}

/** Caller-neutral field update ready for one canonical command. */
export interface TextStyleResolvedFieldUpdate extends TextStyleExactRange {
  /** TextStyle-owned field to update. */
  readonly field: TextStyleField;
  /** Canonical requested value. */
  readonly value: TextStyleFieldValue;
}
