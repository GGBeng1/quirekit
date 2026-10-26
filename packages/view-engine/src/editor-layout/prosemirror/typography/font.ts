import type { QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { Mark as ProseMirrorMark } from "@quirekit/pm";
import { replaceQuireFontFamily, scaleQuireFontSize, replaceQuireFontSize, resolveQuireCanvasFontSize } from "@quirekit/layout/text";

/**
 * Resolves a CSS font token from a base font and inline ProseMirror marks.
 *
 * Weight, style, and family are all sourced from each mark's declared
 * `canvasStyle` delta (Bold → `fontWeight`, Italic → `fontStyle`, Code →
 * monospace `fontFamily`, TextStyle → `fontFamily` attr). Deltas apply in
 * document mark order; the last family wins.
 *
 * Resolution is a CSS-style cascade (last write wins per property), not boolean
 * accumulation: the node base style sets the defaults, then each mark delta in
 * document order *overrides* the property it declares. This is what lets a mark
 * set `fontWeight: "normal"` to un-bold a heading whose node default is bold —
 * matching how the HTML backend's CSS cascade already behaves.
 *
 * @param baseFont - Base CSS font shorthand.
 * @param marks - Marks applied to the inline run.
 * @param resolveMarkStyle - Optional resolver for per-mark canvas style deltas.
 * @param nodeStyle - Optional node base text style for the owning block.
 * @returns Font shorthand for the marked run.
 */
export function resolveQuireMarkedFont(
  baseFont: string,
  marks: readonly ProseMirrorMark[],
  resolveMarkStyle?: QuireMarkCanvasStyleResolver,
  nodeStyle?: QuireNodeCanvasTextStyle | null
): string {
  if (marks.length === 0 && (nodeStyle === null || nodeStyle === undefined)) {
    return baseFont;
  }

  let fontWeight: "normal" | "bold" = nodeStyle?.fontWeight ?? "normal";
  let fontStyle: "normal" | "italic" = nodeStyle?.fontStyle ?? "normal";
  let fontVariantCaps: "normal" | "small-caps" = nodeStyle?.fontVariantCaps ?? "normal";
  let fontFamily: string | null =
    typeof nodeStyle?.fontFamily === "string" && nodeStyle.fontFamily.trim().length > 0
      ? nodeStyle.fontFamily.trim()
      : null;
  let fontSize: string | null = typeof nodeStyle?.fontSize === "string" ? resolveQuireCanvasFontSize(nodeStyle.fontSize) : null;
  let markFontScale = nodeStyle?.glyphScale ?? 1;
  let explicitlyNormalWeight = false;
  let explicitlyNormalStyle = false;
  const fontScale = nodeStyle?.fontScale ?? 1;

  for (const mark of marks) {
    const delta = resolveMarkStyle?.(mark);

    if (!delta) {
      continue;
    }
    if (delta.fontWeight !== undefined) {
      fontWeight = delta.fontWeight;
      explicitlyNormalWeight ||= delta.fontWeight === "normal";
    }
    if (delta.fontStyle !== undefined) {
      fontStyle = delta.fontStyle;
      explicitlyNormalStyle ||= delta.fontStyle === "normal";
    }
    if (delta.fontVariantCaps !== undefined) {
      fontVariantCaps = delta.fontVariantCaps;
    }
    if (typeof delta.fontFamily === "string" && delta.fontFamily.trim().length > 0) {
      fontFamily = delta.fontFamily.trim();
    }
    if (typeof delta.fontSize === "string") {
      fontSize = resolveQuireCanvasFontSize(delta.fontSize) ?? fontSize;
    }
    if (
      typeof delta.fontScale === "number"
      && Number.isFinite(delta.fontScale)
      && delta.fontScale > 0
    ) {
      markFontScale = delta.fontScale;
    }
  }

  // Direct inherited-style resets are authoritative even if malformed imported
  // mark order places a semantic true mark after the reset contributor.
  if (explicitlyNormalWeight) fontWeight = "normal";
  if (explicitlyNormalStyle) fontStyle = "normal";

  // Node scale applies first; an absolute mark font-size overrides it (CSS).
  let resolvedBaseFont = fontScale === 1 ? baseFont : scaleQuireFontSize(baseFont, fontScale);
  if (fontSize !== null) {
    resolvedBaseFont = replaceQuireFontSize(resolvedBaseFont, fontSize);
  }
  if (markFontScale !== 1) {
    resolvedBaseFont = scaleQuireFontSize(resolvedBaseFont, markFontScale);
  }
  if (fontFamily !== null) {
    resolvedBaseFont = replaceQuireFontFamily(resolvedBaseFont, fontFamily);
  }

  const prefixes: string[] = [];
  if (fontStyle === "italic") {
    prefixes.push("italic");
  }
  if (fontVariantCaps === "small-caps") {
    prefixes.push("small-caps");
  }
  if (fontWeight === "bold") {
    prefixes.push("bold");
  }

  return prefixes.length === 0 ? resolvedBaseFont : `${prefixes.join(" ")} ${resolvedBaseFont}`;
}
