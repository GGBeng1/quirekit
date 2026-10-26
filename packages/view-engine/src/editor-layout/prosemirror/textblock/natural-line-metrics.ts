import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import {
  collectQuireMetricSamplesByFont,
  QUIRE_LATIN_VERTICAL_METRIC_SAMPLE
} from "@quirekit/layout/text";

const paragraphMarkEastAsianMetricSample = "字";

/** Natural vertical glyph metrics resolved across effective inline run fonts. */
export interface QuireNaturalRunGlyphMetrics {
  /** Maximum glyph ascent above the shared baseline. */
  readonly ascent: number;
  /** Maximum glyph descent below the shared baseline. */
  readonly descent: number;
  /** Combined natural glyph extent. */
  readonly extent: number;
  /** Natural line strut including the largest effective font line gap. */
  readonly lineHeight: number;
  /** Baseline offset after centering surplus line gap around the glyph extent. */
  readonly baselineOffset: number;
}

/**
 * Measures the maximum ascent and descent across effective run fonts.
 *
 * Text backends that cannot expose ascent and descent fall back to the
 * effective CSS font size. Empty paragraphs use the paragraph-mark font.
 *
 * @param runs - Mark-resolved inline runs.
 * @param fallbackFont - Effective paragraph-mark font used by an empty paragraph.
 * @param textMeasurer - Active text measurement backend.
 * @param fallbackText - Paragraph-mark sample used when no visible run owns text.
 * @returns Positive natural glyph extent with ascent and descent.
 */
export function resolveQuireNaturalRunGlyphMetrics(
  runs: readonly QuireInlineTextRun[],
  fallbackFont: string,
  textMeasurer: QuireTextMeasurer,
  fallbackText = QUIRE_LATIN_VERTICAL_METRIC_SAMPLE
): QuireNaturalRunGlyphMetrics {
  const visibleRuns = runs.filter((run) => run.hiddenText !== "collapsed");
  const samplesByFont = collectQuireMetricSamplesByFont(
    visibleRuns,
    fallbackFont,
    fallbackText
  );
  let ascent = 0;
  let descent = 0;
  let fontSize = 0;
  let normalLineHeight = 0;

  for (const [font, samples] of samplesByFont) {
    fontSize = Math.max(fontSize, parseFontSizePx(font) ?? 0);
    for (const sample of samples) {
      const measured = textMeasurer.measureText(sample, font);
      ascent = Math.max(ascent, sanitizeMetric(measured.ascent));
      descent = Math.max(descent, sanitizeMetric(measured.descent));
      normalLineHeight = Math.max(
        normalLineHeight,
        sanitizeMetric(measured.lineHeight)
      );
    }
  }

  const measuredExtent = ascent + descent;
  if (measuredExtent > 0) {
    const lineHeight = Math.max(measuredExtent, normalLineHeight);
    return {
      ascent,
      descent,
      extent: measuredExtent,
      lineHeight,
      baselineOffset: ascent + (lineHeight - measuredExtent) / 2
    };
  }

  const extent = fontSize > 0 ? fontSize : 1;
  const lineHeight = Math.max(extent, normalLineHeight);
  return {
    ascent: extent * 0.8,
    descent: extent * 0.2,
    extent,
    lineHeight,
    baselineOffset: extent * 0.8 + (lineHeight - extent) / 2
  };
}

/**
 * Selects a paragraph-mark sample from its direct Word font-family role.
 *
 * @param fontFamily - Direct paragraph-mark family, or null when inherited.
 * @returns East Asian or Latin sample used only when the paragraph owns no text.
 */
export function resolveQuireParagraphMarkMetricSample(
  fontFamily: string | null | undefined
): string {
  if (fontFamily === null || fontFamily === undefined) {
    return QUIRE_LATIN_VERTICAL_METRIC_SAMPLE;
  }
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
    .test(fontFamily)
    || /(?:CJK|\bSC\b|\bTC\b|SimSun|SimHei|KaiTi|FangSong|Meiryo|Mincho|Gothic|Malgun|Batang|Dotum)/iu
      .test(fontFamily)
    ? paragraphMarkEastAsianMetricSample
    : QUIRE_LATIN_VERTICAL_METRIC_SAMPLE;
}

/**
 * Converts an optional metric into a non-negative finite number.
 *
 * @param value - Candidate font metric.
 * @returns Valid metric or zero.
 */
function sanitizeMetric(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Parses the first CSS pixel-size token from one font shorthand.
 *
 * @param font - CSS font shorthand.
 * @returns Positive pixel size, or undefined when no valid token exists.
 */
function parseFontSizePx(font: string): number | undefined {
  const match = /(\d+(?:\.\d+)?)px/u.exec(font);
  const size = match === null ? Number.NaN : Number(match[1]);
  return Number.isFinite(size) && size > 0 ? size : undefined;
}
