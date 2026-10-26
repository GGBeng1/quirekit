import type { QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import type { Mark } from "@quirekit/pm";

/**
 * Projects semantic emphasis into horizontal physical paint before line measurement.
 * The derived underDot is never written back to the source mark or DOCX token.
 * @param marks - Direct run marks in cascade order.
 * @param resolveMarkStyle - Extension-owned canvas-style resolver.
 * @param nodeStyle - Effective document and paragraph-style defaults.
 * @param eastAsia - Effective East Asian language, independent of glyph font slot.
 * @returns Physical visible marker kind, or undefined for absent/cleared emphasis.
 */
export function resolveInlineEmphasisMark(
  marks: readonly Mark[],
  resolveMarkStyle: QuireMarkCanvasStyleResolver | undefined,
  nodeStyle: QuireNodeCanvasTextStyle | null | undefined,
  eastAsia: string | undefined
): QuireInlineTextRun["emphasisMark"] {
  let value = nodeStyle?.emphasisMark;
  for (const mark of marks) {
    const direct = resolveMarkStyle?.(mark)?.emphasisMark;
    if (direct !== undefined) value = direct;
  }
  if (value === undefined || value === "none") return undefined;
  // Word uses EastAsia even for Latin glyphs in a mixed run. Script is more
  // specific than region, so an explicit Hant tag must not become Simplified.
  const parts = eastAsia?.toLowerCase().split("-") ?? [];
  const simplified = parts[0] === "zh" && !parts.includes("hant")
    && (parts.includes("hans") || parts.includes("cn") || parts.includes("sg"));
  return value === "dot" && simplified ? "underDot" : value;
}
