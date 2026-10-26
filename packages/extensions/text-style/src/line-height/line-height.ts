import {
  configureTextStyleAttributeExtension,
  createTextStyleAttributeExtension,
  type TextStyleAttributeExtensionOptions
} from "../attribute-extension";
import type { QuireAnyExtension } from "@quirekit/core";

/**
 * Options for the legacy CSS line-height extension.
 *
 * @deprecated Word-compatible products must use paragraph-owned line spacing.
 */
export type LineHeightOptions = TextStyleAttributeExtensionOptions;

/**
 * Legacy CSS LineHeight extension that stores `lineHeight` on textStyle.
 *
 * @deprecated This extension is no longer part of TextStyleKit because document
 * line spacing belongs to paragraphs. It remains an explicit opt-in for HTML
 * editors that intentionally use run-level CSS semantics.
 */
export const LineHeight = createTextStyleAttributeExtension({
  name: "lineHeight",
  setCommandName: "setLineHeight",
  unsetCommandName: "unsetLineHeight",
  attributeName: "lineHeight",
  styleName: "line-height"
});

/**
 * Creates the legacy CSS lineHeight extension.
 *
 * @param options - Optional lineHeight options.
 * @returns Explicit opt-in extension that adds CSS lineHeight commands.
 * @deprecated Use paragraph-owned line spacing for Word-compatible documents.
 */
export function lineHeightExtension(
  options: Partial<LineHeightOptions> = {}
): QuireAnyExtension {
  return configureTextStyleAttributeExtension(LineHeight, options);
}
