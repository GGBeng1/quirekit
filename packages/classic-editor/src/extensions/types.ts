import type { StarterKitOptions } from "@quirekit/starter-kit";
import type { QuireAnyExtension } from "@quirekit/core";
import type { FormattingOptions, BlockInteractionOptions, TextCaseOptions } from "@quirekit/extensions";
import type { SearchExtensionOptions } from "@quirekit/extension-search";
import type { ClassicEditorClipboardOptions } from "./clipboard";
import type {
  BackgroundColorOptions,
  ColorOptions,
  DoubleStrikeOptions,
  FontFamilyOptions,
  FontSizeOptions,
  HighlightOptions,
  LanguageOptions,
  LetterSpacingOptions,
  ScriptPositionOptions,
  TextStyleOptions
} from "@quirekit/extension-text-style";

/** Options used to compose the Classic formatting Mark variants. */
export interface ClassicEditorFormattingOptions {
  /** Double-strike options, or false to omit the Word-compatible mark. */
  readonly doubleStrike?: Partial<DoubleStrikeOptions> | false;
  /** Superscript options, or false to omit the semantic mark. */
  readonly superscript?: Partial<ScriptPositionOptions> | false;
  /** Subscript options, or false to omit the semantic mark. */
  readonly subscript?: Partial<ScriptPositionOptions> | false;
  /** Bold Mark options, or false to omit Bold from the formatting group. */
  readonly bold?: StarterKitOptions["bold"];
  /** Italic Mark options, or false to omit Italic from the formatting group. */
  readonly italic?: StarterKitOptions["italic"];
  /** Semantic Highlight options, or false to omit OOXML-compatible highlighting. */
  readonly highlight?: Partial<HighlightOptions> | false;
  /** Underline Mark options, or false to omit Underline from the formatting group. */
  readonly underline?: StarterKitOptions["underline"];
  /** Strike Mark options, or false to omit Strike from the formatting group. */
  readonly strike?: StarterKitOptions["strike"];
  /** TextStyle Mark options, or false to omit direct text-style storage. */
  readonly textStyle?: Partial<TextStyleOptions> | false;
  /** FontFamily options, or false to omit direct family commands and picker. */
  readonly fontFamily?: Partial<FontFamilyOptions> | false;
  /** FontSize options, or false to omit size commands and controls. */
  readonly fontSize?: Partial<FontSizeOptions> | false;
  /** LetterSpacing options, or false to omit Word-compatible tracking commands. */
  readonly letterSpacing?: Partial<LetterSpacingOptions> | false;
  /** Run-language options, or false to omit Word-compatible language commands. */
  readonly language?: Partial<LanguageOptions> | false;
  /** Text Color options, or false to omit foreground color commands and controls. */
  readonly color?: Partial<ColorOptions> | false;
  /** BackgroundColor options, or false to omit character shading controls. */
  readonly backgroundColor?: Partial<BackgroundColorOptions> | false;
}

/** StarterKit-compatible options for the product-aware Classic assembly. */
export interface ClassicEditorKitOptions extends StarterKitOptions {
  /** Configured undo/redo provider replacing PM history while retaining standard Classic controls. */
  readonly historyExtension?: QuireAnyExtension;
  /** Structural block interaction options, or false for a feature-owned variant. */
  readonly blockInteraction?: Partial<BlockInteractionOptions> | false;
  /** Formatting-tools options, or false to omit format painter and clear formatting. */
  readonly formatting?: Partial<FormattingOptions> | false;
  /** Find and replace options, or false to omit the search panel. */
  readonly search?: Partial<SearchExtensionOptions> | false;
  /** Change Case options, or false to omit the Home "Aa" menu and its commands. */
  readonly textCase?: Partial<TextCaseOptions> | false;
  /** Context-menu clipboard options, or false to omit cut/copy/paste rows. */
  readonly clipboard?: Partial<ClassicEditorClipboardOptions> | false;
  /** Double-strike options, or false to omit the Word-compatible mark. */
  readonly doubleStrike?: Partial<DoubleStrikeOptions> | false;
  /** Superscript options, or false to omit the semantic mark. */
  readonly superscript?: Partial<ScriptPositionOptions> | false;
  /** Subscript options, or false to omit the semantic mark. */
  readonly subscript?: Partial<ScriptPositionOptions> | false;
  /** TextStyle Mark options, or false to omit the text-style capability closure. */
  readonly textStyle?: Partial<TextStyleOptions> | false;
  /** Semantic Highlight options, or false to omit OOXML-compatible highlighting. */
  readonly highlight?: Partial<HighlightOptions> | false;
  /** FontFamily options, or false to omit direct family commands and picker. */
  readonly fontFamily?: Partial<FontFamilyOptions> | false;
  /** FontSize options, or false to omit size commands and controls. */
  readonly fontSize?: Partial<FontSizeOptions> | false;
  /** LetterSpacing options, or false to omit Word-compatible tracking commands. */
  readonly letterSpacing?: Partial<LetterSpacingOptions> | false;
  /** Run-language options, or false to omit Word-compatible language commands. */
  readonly language?: Partial<LanguageOptions> | false;
  /** Text Color options, or false to omit foreground color commands and controls. */
  readonly color?: Partial<ColorOptions> | false;
  /** BackgroundColor options, or false to omit character shading controls. */
  readonly backgroundColor?: Partial<BackgroundColorOptions> | false;
}
