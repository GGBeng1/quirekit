import type { QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { Mark } from "@quirekit/pm";
import { styleDeltas, readNonEmptyStyleValue } from "./shared";

/**
 * Resolves the last declared glyph color; transient highlights are separate layers.
 * @param marks - Direct run marks.
 * @param resolveMarkStyle - Cached resolver.
 * @param nodeStyle - Inherited typography.
 * @returns Effective glyph color, or undefined.
 */
export function resolveQuireMarkedColor(marks: readonly Mark[], resolveMarkStyle?: QuireMarkCanvasStyleResolver, nodeStyle?: QuireNodeCanvasTextStyle | null): string | undefined {
  let color: string | undefined;
  for (const delta of styleDeltas(marks, resolveMarkStyle, nodeStyle)) color = readNonEmptyStyleValue(delta.color) ?? color;
  return color;
}

/**
 * Layers highlighter over shading; explicit null reveals the underlying shading.
 * @param marks - Direct run marks.
 * @param resolveMarkStyle - Cached resolver.
 * @param nodeStyle - Inherited typography.
 * @returns Effective background fill, or undefined.
 */
export function resolveQuireMarkedBackgroundColor(marks: readonly Mark[], resolveMarkStyle?: QuireMarkCanvasStyleResolver, nodeStyle?: QuireNodeCanvasTextStyle | null): string | undefined {
  let background: string | undefined, highlight: string | null | undefined;
  for (const delta of styleDeltas(marks, resolveMarkStyle, nodeStyle)) {
    if (delta.highlightColor !== undefined) highlight = delta.highlightColor;
    background = readNonEmptyStyleValue(delta.backgroundColor) ?? background;
  }
  return highlight ?? background;
}

/**
 * Resolves visibility without confusing explicit false with inheritance.
 * @param marks - Direct run marks.
 * @param resolveMarkStyle - Cached resolver.
 * @param nodeStyle - Inherited typography.
 * @returns Last explicit visibility state, or undefined.
 */
export function resolveQuireMarkedHiddenText(marks: readonly Mark[], resolveMarkStyle?: QuireMarkCanvasStyleResolver, nodeStyle?: QuireNodeCanvasTextStyle | null): boolean | undefined {
  let hidden: boolean | undefined;
  for (const delta of styleDeltas(marks, resolveMarkStyle, nodeStyle)) if (typeof delta.hidden === "boolean") hidden = delta.hidden;
  return hidden;
}
