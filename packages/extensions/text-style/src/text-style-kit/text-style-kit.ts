import {
  BackgroundColor,
  type BackgroundColorOptions
} from "../background-color";
import { Color, type ColorOptions } from "../color";
import { DoubleStrike, type DoubleStrikeOptions } from "../double-strike";
import { FontFamily, type FontFamilyOptions } from "../font-family";
import { FontSize, type FontSizeOptions } from "../font-size";
import { LetterSpacing, type LetterSpacingOptions } from "../letter-spacing";
import { Language, type LanguageOptions } from "../language";
import {
  Subscript,
  Superscript,
  type ScriptPositionOptions
} from "../script-position";
import { TextStyle, type TextStyleOptions } from "../text-style";
import { Extension, type QuireAnyExtension } from "@quirekit/core";

/** Options for the bundled textStyleKit extension. */
export interface TextStyleKitOptions {
  /** Double-strike extension options, or false to disable. */
  readonly doubleStrike: Partial<DoubleStrikeOptions> | false;
  /** Superscript extension options, or false to disable. */
  readonly superscript: Partial<ScriptPositionOptions> | false;
  /** Subscript extension options, or false to disable. */
  readonly subscript: Partial<ScriptPositionOptions> | false;
  /** Font family extension options, or false to disable. */
  readonly fontFamily: Partial<FontFamilyOptions> | false;
  /** Color extension options, or false to disable. */
  readonly color: Partial<ColorOptions> | false;
  /** Background color extension options, or false to disable. */
  readonly backgroundColor: Partial<BackgroundColorOptions> | false;
  /** Font size extension options, or false to disable. */
  readonly fontSize: Partial<FontSizeOptions> | false;
  /** Word-compatible character-spacing options, or false to disable. */
  readonly letterSpacing: Partial<LetterSpacingOptions> | false;
  /** Word-compatible run-language options, or false to disable. */
  readonly language: Partial<LanguageOptions> | false;
  /** TextStyle mark options, or false to disable. */
  readonly textStyle: Partial<TextStyleOptions> | false;
}

/** Bundle mirroring Tiptap's textStyleKit convenience extension. */
export const TextStyleKit = Extension.create<TextStyleKitOptions>({
  name: "textStyleKit",
  addOptions() {
    return {
      doubleStrike: {},
      superscript: {},
      subscript: {},
      fontFamily: {},
      color: {},
      backgroundColor: {},
      fontSize: {},
      letterSpacing: {},
      language: {},
      textStyle: {}
    };
  },
  addExtensions() {
    const extensions: QuireAnyExtension[] = [];

    if (this.options.doubleStrike !== false) {
      extensions.push(DoubleStrike.configure(this.options.doubleStrike));
    }

    if (this.options.superscript !== false) {
      extensions.push(Superscript.configure(this.options.superscript));
    }

    if (this.options.subscript !== false) {
      extensions.push(Subscript.configure(this.options.subscript));
    }

    if (this.options.fontFamily !== false) {
      extensions.push(FontFamily.configure(this.options.fontFamily));
    }

    if (this.options.color !== false) {
      extensions.push(Color.configure(this.options.color));
    }

    if (this.options.backgroundColor !== false) {
      extensions.push(BackgroundColor.configure(this.options.backgroundColor));
    }

    if (this.options.fontSize !== false) {
      extensions.push(FontSize.configure(this.options.fontSize));
    }

    if (this.options.letterSpacing !== false) {
      extensions.push(LetterSpacing.configure(this.options.letterSpacing));
    }

    if (this.options.language !== false) {
      extensions.push(Language.configure(this.options.language));
    }

    if (this.options.textStyle !== false) {
      extensions.push(TextStyle.configure(this.options.textStyle));
    }

    return extensions;
  }
});

/**
 * Creates the bundled textStyleKit extension.
 *
 * @param options - Optional textStyleKit options.
 * @returns Extension bundle containing textStyle and related style extensions.
 */
export function textStyleKitExtension(
  options: Partial<TextStyleKitOptions> = {}
): QuireAnyExtension {
  return TextStyleKit.configure(options);
}
