import type { QuireNodeCanvasTextStyle } from "@quirekit/core";

/** Boolean style properties whose OOXML values toggle the inherited state. */
export type WordStyleToggle = "bold" | "italic" | "boldCs" | "italicCs" | "allCaps" | "smallCaps"
  | "strike" | "doubleStrike" | "outline" | "shadow" | "emboss" | "imprint" | "hidden";

/** Named theme color binding retained independently of its fallback RGB. */
export interface WordStyleColorReference {
  /** DrawingML color slot or Word alias such as text1. */
  readonly slot: string;
  /** Optional hexadecimal tint byte. */
  readonly tint?: string;
  /** Optional hexadecimal shade byte. */
  readonly shade?: string;
}

/** OOXML font bindings; each script slot inherits independently. */
export interface WordStyleFontReferences {
  /** asciiTheme token. */
  readonly latin?: string;
  /** hAnsiTheme token. */
  readonly highAnsi?: string;
  /** eastAsiaTheme token. */
  readonly eastAsia?: string;
  /** cstheme token. */
  readonly complexScript?: string;
}

/** Canonical style delta, before Word inheritance is projected into neutral rendering. */
export interface WordStyleTextProperties extends QuireNodeCanvasTextStyle {
  /** Font classification hint, inherited independently of the font families. */
  readonly fontHint?: "default" | "eastAsia" | "cs";
  /** Imported toggle operations; explicit absolute properties override their own toggle. */
  readonly toggles?: Readonly<Partial<Record<WordStyleToggle, boolean>>>;
  /** Independent high-ANSI font; the current renderer projects it to its Latin slot. */
  readonly fontFamilyHighAnsi?: string;
  /** Theme bindings take precedence over fallback literal families in their own slots. */
  readonly fontReferences?: WordStyleFontReferences;
  /** Theme glyph color, independent of the fallback color. */
  readonly colorReference?: WordStyleColorReference;
  /** Semantic Word highlighter name, including none. */
  readonly highlight?: string;
  /** Explicit single strike state, independent of underline. */
  readonly strike?: boolean;
  /** Explicit double strike state, independent of underline. */
  readonly doubleStrike?: boolean;
  /** Baseline position; baseline explicitly clears superscript/subscript. */
  readonly verticalAlignment?: "baseline" | "superscript" | "subscript";
}
