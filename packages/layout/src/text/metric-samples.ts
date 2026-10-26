import type { QuireMetricSampleSource } from "./types";

/** Latin probe carrying both an ascender and a descender for vertical extents. */
export const QUIRE_LATIN_VERTICAL_METRIC_SAMPLE = "Hg";

/**
 * Bounded script families that can resolve to a different vertical metric face.
 *
 * The bucket exists only to deduplicate samples. It is not a language tag, and
 * it never selects a font by itself: the resolved face stays authoritative.
 */
export type QuireVerticalMetricScript =
  | "latin"
  | "han"
  | "kana"
  | "hangul"
  | "arabic"
  | "hebrew"
  | "devanagari"
  | "other";

/**
 * Groups bounded script samples by their exact paint font.
 *
 * One CSS font stack can resolve different scripts to different faces, so a
 * single probe per font is not enough: every script that will actually paint
 * must contribute its own measured glyph. Sampling stays bounded to at most one
 * glyph per script per font.
 *
 * @param runs - Visible runs whose scripts must contribute metrics.
 * @param fallbackFont - Font measured when the line owns no visible text.
 * @param fallbackText - Sample measured for that empty-line case.
 * @returns Font-keyed samples whose union covers every visible script.
 */
export function collectQuireMetricSamplesByFont(
  runs: readonly QuireMetricSampleSource[],
  fallbackFont: string,
  fallbackText: string
): ReadonlyMap<string, ReadonlySet<string>> {
  const samplesByFont = new Map<string, Set<string>>();
  if (runs.length === 0) {
    samplesByFont.set(fallbackFont, new Set([fallbackText]));
    return samplesByFont;
  }

  // Phase boundary: group by paint font before unioning scripts. Metric
  // identity is the resolved face, so samples are deduplicated per font rather
  // than per script across the whole line.
  for (const run of runs) {
    const samples = samplesByFont.get(run.font) ?? new Set<string>();
    for (const sample of collectRunMetricSamples(run.text)) {
      samples.add(sample);
    }
    samplesByFont.set(run.font, samples);
  }
  return samplesByFont;
}

/**
 * Collects at most one actual glyph per script from visible run text.
 *
 * Latin keeps the traditional `Hg` probe so the sample carries both an
 * ascender and a descender. Other scripts keep their first real glyph so that
 * Canvas fallback selection matches the glyph that will actually be painted.
 *
 * @param text - Visible run text in document order.
 * @returns Bounded metric samples in first-script occurrence order.
 */
function collectRunMetricSamples(text: string): readonly string[] {
  const samples = new Map<QuireVerticalMetricScript, string>();
  for (const character of Array.from(text)) {
    if (isMetricSampleSeparator(character)) continue;
    const script = classifyQuireVerticalMetricScript(character);
    if (samples.has(script)) continue;
    samples.set(
      script,
      script === "latin" ? QUIRE_LATIN_VERTICAL_METRIC_SAMPLE : character
    );
  }
  return samples.size === 0
    ? [QUIRE_LATIN_VERTICAL_METRIC_SAMPLE]
    : [...samples.values()];
}

/**
 * Reports whether one scalar only separates glyphs and cannot own metrics.
 *
 * @param character - One Unicode scalar from a run.
 * @returns Whether the scalar is whitespace, punctuation, or a control code.
 */
function isMetricSampleSeparator(character: string): boolean {
  return /^[\p{White_Space}\p{Punctuation}\p{Control}]$/u.test(character);
}

/**
 * Classifies one Unicode scalar into a bounded vertical-metric script family.
 *
 * @param character - One Unicode scalar from a run.
 * @returns Stable script bucket used only for metric sample deduplication.
 */
export function classifyQuireVerticalMetricScript(
  character: string
): QuireVerticalMetricScript {
  if (/\p{Script=Latin}/u.test(character)) return "latin";
  if (/\p{Script=Han}/u.test(character)) return "han";
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(character)) return "kana";
  if (/\p{Script=Hangul}/u.test(character)) return "hangul";
  if (/\p{Script=Arabic}/u.test(character)) return "arabic";
  if (/\p{Script=Hebrew}/u.test(character)) return "hebrew";
  if (/\p{Script=Devanagari}/u.test(character)) return "devanagari";
  return "other";
}
