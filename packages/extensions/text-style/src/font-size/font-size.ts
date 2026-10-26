import {
  configureTextStyleAttributeExtension,
  createTextStyleAttributeExtension,
  type TextStyleAttributeExtensionOptions,
  unsetTextStyleAttributeCommand
} from "../attribute-extension";
import type { QuireAnyExtension } from "@quirekit/core";
import {
  changeFontSizeCommand,
  setValidatedComplexScriptFontSizeCommand,
  setValidatedFontSizeCommand
} from "./commands";

/** Options for the fontSize extension. */
export type FontSizeOptions = TextStyleAttributeExtensionOptions;

const FontSizeAttribute = createTextStyleAttributeExtension({
  name: "fontSize",
  setCommandName: "setFontSize",
  unsetCommandName: "unsetFontSize",
  attributeName: "fontSize",
  styleName: "font-size",
  ai: { name: "fontSize", description: "Font size in points, such as \"18pt\".", schema: { type: "string", pattern: "^[0-9]+(\\.[0-9]+)?pt$" },
    present: { label: "字号", value: value => String(value).replace(/pt$/u, " 磅") } }
});

/** FontSize extension with validated set, unset, grow, and shrink commands. */
export const FontSize = FontSizeAttribute.extend({
  /**
   * Creates all direct font-size commands.
   *
   * @returns Validated and Word-compatible command handlers.
   */
  addCommands() {
    return {
      setFontSize: setValidatedFontSizeCommand(),
      unsetFontSize: unsetTextStyleAttributeCommand("fontSize"),
      setComplexScriptFontSize: setValidatedComplexScriptFontSizeCommand(),
      unsetComplexScriptFontSize: unsetTextStyleAttributeCommand(
        "fontSizeComplexScript"
      ),
      increaseFontSize: changeFontSizeCommand(true),
      decreaseFontSize: changeFontSizeCommand(false)
    };
  }
});

/**
 * Creates the fontSize extension.
 *
 * @param options - Optional fontSize options.
 * @returns Extension that adds fontSize commands and attributes.
 */
export function fontSizeExtension(options: Partial<FontSizeOptions> = {}): QuireAnyExtension {
  return configureTextStyleAttributeExtension(FontSize, options);
}
