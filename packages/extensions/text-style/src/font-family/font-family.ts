import {
  configureTextStyleAttributeExtension,
  createTextStyleAttributeExtension,
  setTextStyleAttributeCommand,
  unsetTextStyleAttributeCommand,
  type TextStyleAttributeExtensionOptions
} from "../attribute-extension";
import {
  setMark,
  type QuireAnyExtension,
  type CommandSpec
} from "@quirekit/core";

/** Options for the fontFamily extension. */
export type FontFamilyOptions = TextStyleAttributeExtensionOptions;

/** FontFamily extension that stores `fontFamily` on the textStyle mark. */
const BaseFontFamily = createTextStyleAttributeExtension({
  name: "fontFamily",
  setCommandName: "setFontFamily",
  unsetCommandName: "unsetFontFamily",
  attributeName: "fontFamily",
  styleName: "font-family",
  ai: { name: "fontFamily", description: "Font family name, such as \"宋体\".", schema: { type: "string", minLength: 1, examples: ["宋体", "Arial"] }, present: { label: "字体" } }
});

/** FontFamily extension with all-script and independent script-slot commands. */
export const FontFamily = BaseFontFamily.extend({
  addCommands() {
    return {
      setFontFamily: setAllFontFamiliesCommand(),
      unsetFontFamily: unsetTextStyleAttributeCommand("fontFamily"),
      setLatinFontFamily: setTextStyleAttributeCommand("fontFamilyLatin"),
      unsetLatinFontFamily: unsetTextStyleAttributeCommand("fontFamilyLatin"),
      setEastAsiaFontFamily: setTextStyleAttributeCommand("fontFamilyEastAsia"),
      unsetEastAsiaFontFamily: unsetTextStyleAttributeCommand("fontFamilyEastAsia"),
      setComplexScriptFontFamily:
        setTextStyleAttributeCommand("fontFamilyComplexScript"),
      unsetComplexScriptFontFamily:
        unsetTextStyleAttributeCommand("fontFamilyComplexScript")
    };
  }
});

/**
 * Creates the backward-compatible all-script font preset.
 *
 * Explicit script overrides are cleared in the same transaction so a later
 * mode switch cannot reveal stale families underneath the preset.
 *
 * @returns Command that applies one family to every script.
 */
function setAllFontFamiliesCommand(): CommandSpec {
  return (value) => (context) => setMark("textStyle", {
    fontFamily: value,
    fontFamilyLatin: null,
    fontFamilyEastAsia: null,
    fontFamilyComplexScript: null
  })(context);
}

/**
 * Creates the fontFamily extension.
 *
 * @param options - Optional fontFamily options.
 * @returns Extension that adds fontFamily commands and attributes.
 */
export function fontFamilyExtension(
  options: Partial<FontFamilyOptions> = {}
): QuireAnyExtension {
  return configureTextStyleAttributeExtension(FontFamily, options);
}
