import type { ShapedRunData } from "../shaping";
import type { RunGrapheme } from "../units";

const cjkLetter = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const distributableText = /^[\p{Script=Latin}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Number}\p{Punctuation}\p{Symbol}\p{Mark}\u0020\u200d]+$/u;

/**
 * Admits the common non-cursive distribution slice without splitting graphemes.
 * @param grapheme - Complete source grapheme and its resolved direction/object role.
 * @returns Whether character-boundary spacing is safe for this grapheme.
 */
export function canDistributeGrapheme(grapheme: RunGrapheme): boolean {
  return (grapheme.level ?? 0) % 2 === 0 && grapheme.replacementInlineSize === undefined
    && distributableText.test(grapheme.text);
}

/**
 * Allocates remaining slot width after wrapping without mutating shaped data.
 * Unsupported tab/mixed-direction rows retain their existing natural geometry.
 *
 * @param graphemes - Logical source graphemes of one slot.
 * @param advances - Mutable copy of natural advances, shared with cluster construction.
 * @param width - Available local slot width.
 * @param shaped - Immutable source shaping products.
 * @param mode - Word/CJK opportunities for justify, character boundaries for distribute.
 * @returns Changed cluster indices and their layout-only trailing advance delta.
 */
export function expandSlotAdvances(
  graphemes: readonly RunGrapheme[],
  advances: number[],
  width: number,
  shaped: ReadonlyMap<number, ShapedRunData>,
  mode: "justify" | "distribute"
): ReadonlyMap<number, number> {
  const changed = new Map<number, number>();
  if (!Number.isFinite(width) || graphemes.some((item) =>
    item.text === "\t" || (item.level ?? 0) % 2 !== 0 || item.replacementInlineSize !== undefined
  )) return changed;
  if (mode === "distribute" && !graphemes.every(canDistributeGrapheme)) return changed;

  let first = 0;
  let end = graphemes.length;
  while (first < end && graphemes[first]!.text === " ") first += 1;
  while (end > first && graphemes[end - 1]!.text === " ") end -= 1;
  const opportunities: number[] = [];
  for (let index = first; index < end - 1; index += 1) {
    const current = graphemes[index]!;
    const next = graphemes[index + 1]!;
    // Shaped cluster interiors remain indivisible, including necessary ligatures.
    if (shaped.get(next.run)?.ligatureBaseByOffset.has(next.offset)
      || shaped.get(current.run)?.ligatureBaseByOffset.has(current.offset)) continue;
    if (mode === "distribute" || current.text === " " || (cjkLetter.test(current.text) && cjkLetter.test(next.text))) {
      opportunities.push(index);
    }
  }
  if (opportunities.length === 0) return changed;
  const natural = advances.slice(0, end).reduce((sum, advance) => sum + advance, 0);
  const remaining = width - natural;
  if (remaining <= 0) return changed;

  // Source whitespace keeps its anchors, but trailing blanks cannot consume the
  // expandable text width. The final opportunity absorbs floating-point residue.
  for (let index = end; index < advances.length; index += 1) {
    if (advances[index] !== 0) changed.set(index, -advances[index]!);
    advances[index] = 0;
  }
  const share = remaining / opportunities.length;
  let allocated = 0;
  opportunities.forEach((index, position) => {
    const extra = position === opportunities.length - 1 ? remaining - allocated : share;
    advances[index] = advances[index]! + extra;
    allocated += extra;
    changed.set(index, extra);
  });
  return changed;
}
