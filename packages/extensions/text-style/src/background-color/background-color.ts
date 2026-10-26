import {
  configureTextStyleAttributeExtension,
  createTextStyleAttributeExtension,
  type TextStyleAttributeExtensionOptions
} from "../attribute-extension";
import type { QuireAnyExtension } from "@quirekit/core";

/** Options for the backgroundColor extension. */
export type BackgroundColorOptions = TextStyleAttributeExtensionOptions;

/** BackgroundColor extension that stores `backgroundColor` on textStyle. */
export const BackgroundColor = createTextStyleAttributeExtension({
  name: "backgroundColor",
  setCommandName: "setBackgroundColor",
  unsetCommandName: "unsetBackgroundColor",
  attributeName: "backgroundColor",
  styleName: "background-color",
  ai: { name: "backgroundColor", description: "Text background color as a CSS color.", schema: { type: "string", minLength: 1, examples: ["#FFFF00"] }, present: { label: "文字底色" } }
});

/**
 * Creates the backgroundColor extension.
 *
 * @param options - Optional backgroundColor options.
 * @returns Extension that adds backgroundColor commands and attributes.
 */
export function backgroundColorExtension(
  options: Partial<BackgroundColorOptions> = {}
): QuireAnyExtension {
  return configureTextStyleAttributeExtension(BackgroundColor, options);
}
