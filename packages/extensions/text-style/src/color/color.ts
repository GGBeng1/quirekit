import {
  configureTextStyleAttributeExtension,
  createTextStyleAttributeExtension,
  type TextStyleAttributeExtensionOptions
} from "../attribute-extension";
import type { QuireAnyExtension } from "@quirekit/core";

/** Options for the color extension. */
export type ColorOptions = TextStyleAttributeExtensionOptions;

/** Color extension that stores `color` on the textStyle mark. */
export const Color = createTextStyleAttributeExtension({
  name: "color",
  setCommandName: "setColor",
  unsetCommandName: "unsetColor",
  attributeName: "color",
  styleName: "color",
  ai: { name: "color", description: "Text color as a CSS color, such as \"#FF0000\".", schema: { type: "string", minLength: 1, examples: ["#C00000"] }, present: { label: "文字颜色" } }
});

/**
 * Creates the color extension.
 *
 * @param options - Optional color options.
 * @returns Extension that adds color commands and attributes.
 */
export function colorExtension(options: Partial<ColorOptions> = {}): QuireAnyExtension {
  return configureTextStyleAttributeExtension(Color, options);
}
