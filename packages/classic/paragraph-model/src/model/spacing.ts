import type {
  WordParagraphLineSpacing,
  WordParagraphSpacing
} from "../types";

/** Twips represented by one CSS pixel at the canonical 96 DPI projection. */
const twipsPerCssPixel = 15;

/** Native Word's default baseline fraction within a fixed-height line box. */
export const wordExactLineBaselineRatio = 0.8;

/** Layout policy applied after resolving paragraph line spacing. */
export type WordParagraphLineHeightMode = "minimum" | "exact";

/** Paragraph line metrics projected into CSS-pixel layout coordinates. */
export interface ResolvedWordParagraphLineMetrics {
  /** Requested line-box height in CSS pixels. */
  readonly lineHeight: number;
  /** Baseline distance from the requested line-box top. */
  readonly baselineOffset: number;
  /** Whether inline runs may grow the line beyond the requested height. */
  readonly mode: WordParagraphLineHeightMode;
}

/** Paragraph before/after spacing projected into CSS-pixel block flow. */
export interface ResolvedWordParagraphBlockSpacing {
  /** Space before the paragraph in CSS pixels. */
  readonly before: number;
  /** Space after the paragraph in CSS pixels. */
  readonly after: number;
}

/**
 * Projects paragraph line spacing without losing the OOXML rule distinction.
 *
 * `auto` scales the natural strut, `atLeast` establishes a physical minimum,
 * and `exact` fixes the line box even when a run contains larger glyphs.
 *
 * @param spacing - Canonical paragraph line spacing, or inherited null.
 * @param naturalLineHeight - Node-style-resolved natural line height.
 * @param naturalBaselineOffset - Node-style-resolved natural baseline.
 * @returns CSS-pixel line metrics and their growth policy.
 */
export function resolveWordParagraphLineMetrics(
  spacing: WordParagraphLineSpacing | null,
  naturalLineHeight: number,
  naturalBaselineOffset: number
): ResolvedWordParagraphLineMetrics {
  if (spacing === null) {
    return {
      lineHeight: naturalLineHeight,
      baselineOffset: naturalBaselineOffset,
      mode: "minimum"
    };
  }

  const requestedLineHeight = spacing.rule === "auto"
    ? naturalLineHeight * spacing.value / 240
    : spacing.value / twipsPerCssPixel;
  const lineHeight = spacing.rule === "atLeast"
    ? Math.max(naturalLineHeight, requestedLineHeight)
    : requestedLineHeight;
  const difference = lineHeight - naturalLineHeight;
  const baselineOffset = spacing.rule === "exact"
    ? lineHeight * wordExactLineBaselineRatio
    : naturalBaselineOffset + difference / 2;

  return {
    lineHeight,
    baselineOffset,
    mode: spacing.rule === "exact" ? "exact" : "minimum"
  };
}

/**
 * Projects paragraph before/after spacing into CSS-pixel block flow.
 *
 * Non-zero line-unit spacing overrides the physical twip value on the same
 * side. Automatic spacing remains producer-owned; until its contextual policy
 * is modeled, an enabled automatic flag retains the existing physical fallback
 * instead of inventing a pixel value.
 *
 * @param spacing - Canonical paragraph-owned spacing.
 * @param effectiveLineHeight - Final paragraph line-box height after grid projection.
 * @returns Non-negative before and after distances in CSS pixels.
 */
export function resolveWordParagraphBlockSpacing(
  spacing: WordParagraphSpacing,
  effectiveLineHeight: number
): ResolvedWordParagraphBlockSpacing {
  return {
    before: resolveBlockSideSpacing(
      spacing.before?.value ?? 0,
      spacing.beforeLines,
      spacing.beforeAutoSpacing,
      effectiveLineHeight
    ),
    after: resolveBlockSideSpacing(
      spacing.after?.value ?? 0,
      spacing.afterLines,
      spacing.afterAutoSpacing,
      effectiveLineHeight
    )
  };
}

/**
 * Resolves one paragraph block side while preserving OOXML precedence.
 *
 * @param physicalTwips - Physical paragraph spacing in twips.
 * @param lineUnits - Spacing in hundredths of one effective line.
 * @param automatic - Producer automatic-spacing switch.
 * @param effectiveLineHeight - Final paragraph line-box height in CSS pixels.
 * @returns Resolved non-negative CSS-pixel spacing.
 */
function resolveBlockSideSpacing(
  physicalTwips: number,
  lineUnits: number | null,
  automatic: boolean | null,
  effectiveLineHeight: number
): number {
  if (automatic !== true && lineUnits !== null && lineUnits > 0) {
    return Math.max(0, effectiveLineHeight) * lineUnits / 100;
  }
  return Math.max(0, physicalTwips) / twipsPerCssPixel;
}
