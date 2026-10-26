/// <reference path="./bidi-js.d.ts" />
import bidiFactory from "bidi-js";

/** Base paragraph direction for bidirectional resolution. */
export type QuireTextBaseDirection = "ltr" | "rtl" | "auto";

/** Shared bidi-js instance; the engine is stateless and reusable. */
const bidiEngine = bidiFactory();

// Hebrew, Arabic, Syriac, Thaana, and Arabic/Hebrew presentation forms.
const RTL_CHAR_PATTERN = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;

/** UAX #9 right-to-left embedding and pop-directional-format controls. */
const RIGHT_TO_LEFT_EMBEDDING = "\u202b";
const POP_DIRECTIONAL_FORMAT = "\u202c";

/** Minimal run contract consumed by run-aware BiDi resolution. */
export interface QuireBidiSourceRun {
  /** Canonical source text; UTF-16 offsets remain authoritative. */
  readonly text: string;
  /** Explicit run-level direction from a Word-compatible run property. */
  readonly direction?: "rtl" | undefined;
}

/**
 * Quickly checks whether text contains any right-to-left character.
 *
 * Lets callers skip BiDi resolution entirely for left-to-right-only text
 * (the overwhelmingly common case), keeping an `"auto"` base direction free.
 *
 * @param text - Text to scan.
 * @returns Whether any right-to-left character is present.
 */
export function containsRtlCharacter(text: string): boolean {
  return RTL_CHAR_PATTERN.test(text);
}

/**
 * Resolves Unicode BiDi (UAX #9) embedding levels for paragraph text.
 *
 * @param text - Full paragraph text in logical order.
 * @param baseDirection - Base direction; `auto` detects from the first strong char.
 * @returns Per-character embedding levels, or null when the text is empty.
 */
export function resolveBidiEmbeddingLevels(
  text: string,
  baseDirection: QuireTextBaseDirection
): Uint8Array | null {
  if (text.length === 0) {
    return null;
  }

  const direction = baseDirection === "auto" ? null : baseDirection;

  return bidiEngine.getEmbeddingLevels(text, direction).levels;
}

/**
 * Resolves embedding levels for source runs with optional explicit RTL spans.
 *
 * Direction controls exist only in a virtual resolution string. The returned
 * array is mapped back to the original UTF-16 source so layout, shaping, caret,
 * selection, and paint share one unchanged coordinate space.
 *
 * @param runs - Source-contiguous runs in logical document order.
 * @param baseDirection - Paragraph base direction.
 * @returns Per-source-code-unit levels, or null for the pure LTR fast path.
 */
export function resolveBidiRunEmbeddingLevels(
  runs: readonly QuireBidiSourceRun[],
  baseDirection: QuireTextBaseDirection
): Uint8Array | null {
  const sourceText = runs.map((run) => run.text).join("");
  const hasExplicitRightToLeft = runs.some((run) => run.direction === "rtl");
  if (!hasExplicitRightToLeft) {
    return containsRtlCharacter(sourceText)
      ? resolveBidiEmbeddingLevels(sourceText, baseDirection)
      : null;
  }
  if (sourceText.length === 0) return null;

  let virtualText = "";
  const virtualToSource: number[] = [];
  let sourceBase = 0;
  for (const run of runs) {
    if (run.direction === "rtl") {
      virtualText += RIGHT_TO_LEFT_EMBEDDING;
      virtualToSource.push(-1);
    }
    for (let offset = 0; offset < run.text.length; offset += 1) {
      virtualText += run.text[offset]!;
      virtualToSource.push(sourceBase + offset);
    }
    if (run.direction === "rtl") {
      virtualText += POP_DIRECTIONAL_FORMAT;
      virtualToSource.push(-1);
    }
    sourceBase += run.text.length;
  }

  const virtualLevels = resolveBidiEmbeddingLevels(virtualText, baseDirection);
  if (virtualLevels === null) return null;
  const levels = new Uint8Array(sourceText.length);
  for (let index = 0; index < virtualToSource.length; index += 1) {
    const sourceIndex = virtualToSource[index]!;
    if (sourceIndex >= 0) levels[sourceIndex] = virtualLevels[index] ?? 0;
  }
  return levels;
}

/**
 * Resolves the visual order of items from their embedding levels (UAX #9 rule L2).
 *
 * Returns the permutation `visual` where `visual[k]` is the logical index drawn at
 * visual position `k`. Pure left-to-right input yields the identity order, so a
 * caller can treat the result uniformly. Items (graphemes) stay intact — only
 * their order is reversed, never split.
 *
 * @param levels - Embedding level per item, in logical order.
 * @returns Logical indices in visual (left-to-right) order.
 */
export function resolveBidiVisualOrder(levels: readonly number[]): number[] {
  const count = levels.length;
  const visual = Array.from({ length: count }, (_, index) => index);

  let maxLevel = 0;
  let lowestOddLevel = Number.POSITIVE_INFINITY;
  for (const level of levels) {
    if (level > maxLevel) {
      maxLevel = level;
    }
    if (level % 2 === 1 && level < lowestOddLevel) {
      lowestOddLevel = level;
    }
  }

  if (lowestOddLevel === Number.POSITIVE_INFINITY) {
    return visual;
  }

  // L2: from the highest level down to the lowest odd level, reverse every
  // contiguous run of items at that level or higher. Reversals compose.
  for (let level = maxLevel; level >= lowestOddLevel; level -= 1) {
    let start = 0;
    while (start < count) {
      if (levels[start]! < level) {
        start += 1;
        continue;
      }
      let end = start;
      while (end < count && levels[end]! >= level) {
        end += 1;
      }
      reverseRange(visual, start, end - 1);
      start = end;
    }
  }

  return visual;
}

/**
 * Reverses a slice of an array in place.
 *
 * @param items - Array to mutate.
 * @param from - First index of the slice.
 * @param to - Last index of the slice.
 */
function reverseRange(items: number[], from: number, to: number): void {
  let left = from;
  let right = to;
  while (left < right) {
    const temp = items[left]!;
    items[left] = items[right]!;
    items[right] = temp;
    left += 1;
    right -= 1;
  }
}
