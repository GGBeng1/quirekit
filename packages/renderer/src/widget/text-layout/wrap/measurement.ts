import type { ShapedRunData } from "../shaping";
import type { BreakUnit, RunGrapheme } from "../units";
import type { QuireTextLayoutOptions } from "../types";
import { forbidsPunctuationBreak } from "../break/punctuation";
import type { WrapGroupRange } from "./types";
import { measureRunGraphemes, readMeasuredAdvance } from "./advances";

/**
 * Measures one break unit, caching the result for group fitting and append.
 *
 * @param units - All line-breaking units.
 * @param index - Unit index to measure.
 * @param measureText - Measurer used for unshaped runs.
 * @param shapedData - Per-run shaping data.
 * @param cache - Per-wrap width cache keyed by unit index.
 * @returns Unit width in canvas coordinate space.
 */
export function measureBreakUnitAtIndex(
  units: readonly BreakUnit[],
  index: number,
  measureText: QuireTextLayoutOptions["measureText"],
  shapedData: ReadonlyMap<number, ShapedRunData>,
  cache: number[]
): number {
  const cached = cache[index];
  if (cached !== undefined) {
    return cached;
  }

  const unit = units[index]!;
  const width = measureBreakUnit(unit, measureText, shapedData)
    + unit.graphemes.reduce((sum, item) => sum + (item.spacingBefore ?? 0), 0);
  cache[index] = width;
  return width;
}

/**
 * Measures one break unit.
 *
 * @param unit - Break unit to measure.
 * @param measureText - Measurer used for unshaped runs.
 * @param shapedData - Per-run shaping data.
 * @returns Unit width in canvas coordinate space.
 */
function measureBreakUnit(
  unit: BreakUnit,
  measureText: QuireTextLayoutOptions["measureText"],
  shapedData: ReadonlyMap<number, ShapedRunData>
): number {
  if (unit.graphemes[0]?.naturalAdvance !== undefined) {
    return unit.graphemes.reduce((width, item) => width + (item.naturalAdvance ?? 0), 0);
  }
  const replacementWidth = measureReplacementGraphemes(unit.graphemes);
  if (replacementWidth !== undefined) {
    return replacementWidth;
  }
  return shapedData.has(unit.run)
    ? measureRunGraphemes(unit.graphemes, measureText, shapedData)
    : unit.graphemes.some((grapheme) => grapheme.letterSpacing !== undefined)
      ? measureRunGraphemes(unit.graphemes, measureText, shapedData)
      : readMeasuredAdvance(measureText(unit.text, unit.font).width * (unit.graphemes[0]?.horizontalScale ?? 1), "break unit");
}

/**
 * Reads the declared width of an atomic replacement unit.
 *
 * @param graphemes - Graphemes owned by one break unit.
 * @returns Replacement width, or undefined for ordinary text.
 */
function measureReplacementGraphemes(
  graphemes: readonly RunGrapheme[]
): number | undefined {
  let width = 0;
  let found = false;
  for (const grapheme of graphemes) {
    if (grapheme.replacementInlineSize === undefined) {
      continue;
    }
    width += grapheme.replacementInlineSize;
    found = true;
  }
  return found ? width : undefined;
}

/**
 * Measures a word or punctuation-protected group across original run boundaries.
 *
 * @param units - All line-breaking units.
 * @param startIndex - Index where the next source group starts.
 * @param measureText - Measurer used for unshaped runs.
 * @param shapedData - Per-run shaping data.
 * @param unitWidths - Per-wrap width cache keyed by unit index.
 * @param output - Mutable output range reused by the caller.
 * @param avoidPunctuationBreaks - Whether punctuation protects adjacent boundaries.
 * @returns Measured contiguous unit range across run boundaries.
 */
export function measureTextGroupRange(
  units: readonly BreakUnit[],
  startIndex: number,
  measureText: QuireTextLayoutOptions["measureText"],
  shapedData: ReadonlyMap<number, ShapedRunData>,
  unitWidths: number[],
  output: WrapGroupRange,
  avoidPunctuationBreaks: boolean
): WrapGroupRange {
  let width = 0;
  let nonBreakingGlue = false;
  let endIndex = startIndex;

  for (let index = startIndex; index < units.length; index += 1) {
    const unit = units[index]!;
    width += measureBreakUnitAtIndex(units, index, measureText, shapedData, unitWidths);
    nonBreakingGlue = nonBreakingGlue || unit.nonBreakingGlue;
    endIndex = index + 1;
    const next = units[index + 1];
    if (next === undefined || next.kind === "hardBreak" || unit.kind === "space" || next.kind === "space") break;
    const wordContinues = unit.kind === "word" && next.kind === "word" && !unit.breakAfter;
    const punctuationContinues = avoidPunctuationBreaks && forbidsPunctuationBreak(
      unit.graphemes.at(-1)!.text, next.graphemes[0]!.text
    );
    if (!wordContinues && !punctuationContinues) break;
  }

  output.startIndex = startIndex;
  output.endIndex = endIndex;
  output.width = width;
  output.nonBreakingGlue = nonBreakingGlue;

  return output;
}
