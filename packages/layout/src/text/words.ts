import type { QuireWordSegment } from "./types";

/**
 * Segments text into words using locale-aware word boundaries.
 *
 * Uses `Intl.Segmenter` so CJK text is split into dictionary words instead of one
 * run, and contractions stay whole; it falls back to a Latin-style character
 * classifier where `Intl.Segmenter` is unavailable.
 *
 * @param text - Text content to segment.
 * @returns Word segments in source order.
 */
export function segmentQuireWords(text: string): readonly QuireWordSegment[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "word" }).segment(text),
      (segment) => ({
        index: segment.index,
        length: segment.segment.length,
        isWordLike: segment.isWordLike ?? false
      })
    );
  }

  return fallbackWordSegments(text);
}

/**
 * Resolves the word range covering a character index, for double-click selection.
 *
 * @param text - Text content to segment.
 * @param index - Character index the selection started at.
 * @returns Word range within the text, or null when the index is not on a word.
 */
export function resolveQuireWordRangeAt(
  text: string,
  index: number
): { readonly from: number; readonly to: number } | null {
  for (const segment of segmentQuireWords(text)) {
    const end = segment.index + segment.length;

    if (index >= segment.index && index < end) {
      return segment.isWordLike ? { from: segment.index, to: end } : null;
    }
  }

  return null;
}

/**
 * Finds the previous word boundary (start of the word before the offset).
 *
 * @param text - Text content to segment.
 * @param offset - Current character offset.
 * @returns Offset of the previous word start, or 0 when none precedes it.
 */
export function findPreviousQuireWordBoundary(text: string, offset: number): number {
  const clamped = clampOffset(offset, text.length);
  let boundary = 0;

  for (const segment of segmentQuireWords(text)) {
    if (segment.isWordLike && segment.index < clamped) {
      boundary = segment.index;
    }
  }

  return boundary;
}

/**
 * Finds the next word boundary (end of the word at or after the offset).
 *
 * @param text - Text content to segment.
 * @param offset - Current character offset.
 * @returns Offset of the next word end, or the text length when none follows.
 */
export function findNextQuireWordBoundary(text: string, offset: number): number {
  const clamped = clampOffset(offset, text.length);

  for (const segment of segmentQuireWords(text)) {
    const end = segment.index + segment.length;

    if (segment.isWordLike && end > clamped) {
      return end;
    }
  }

  return text.length;
}

/**
 * Clamps an offset into the valid `[0, length]` range.
 *
 * @param offset - Offset to clamp.
 * @param length - Text length.
 * @returns Clamped offset.
 */
function clampOffset(offset: number, length: number): number {
  return Math.min(Math.max(offset, 0), length);
}

/**
 * Groups text into word/non-word runs when `Intl.Segmenter` is unavailable.
 *
 * @param text - Text content to segment.
 * @returns Word segments approximated by a Latin-style character classifier.
 */
function fallbackWordSegments(text: string): readonly QuireWordSegment[] {
  const segments: QuireWordSegment[] = [];
  let index = 0;

  while (index < text.length) {
    const isWordLike = isFallbackWordCharacter(text[index] ?? "");
    let end = index + 1;

    while (end < text.length && isFallbackWordCharacter(text[end] ?? "") === isWordLike) {
      end += 1;
    }

    segments.push({ index, length: end - index, isWordLike });
    index = end;
  }

  return segments;
}

/**
 * Classifies a single character as word-like for the fallback segmenter.
 *
 * @param character - Single character to classify.
 * @returns Whether the character is part of a word.
 */
function isFallbackWordCharacter(character: string): boolean {
  return /^[\p{Letter}\p{Number}\p{Connector_Punctuation}'’]$/u.test(character);
}

/**
 * Reports whether a character-sized string separates whitespace-delimited tokens.
 *
 * This is deliberately narrower than the locale word segmentation above: it
 * answers "is this a blank character", so consumers that must rescan raw text
 * for an edit restart do not pay for `Intl.Segmenter` per call.
 *
 * @param text - Character-sized string to inspect.
 * @returns Whether the string is whitespace.
 */
export function isQuireWordWhitespace(text: string): boolean {
  return (
    text === " " ||
    text === "\n" ||
    text === "\t" ||
    text === "\r" ||
    text === "\f" ||
    text === "\v" ||
    text === "\u00a0"
  );
}

/**
 * Finds the start of the whitespace-delimited token before an offset.
 *
 * @param text - Source text to inspect.
 * @param offset - Offset inside or immediately after the token.
 * @returns Start offset after the preceding whitespace boundary.
 */
export function findPreviousQuireWhitespaceBoundary(
  text: string,
  offset: number
): number {
  let cursor = clampOffset(offset, text.length);
  while (cursor > 0 && !isQuireWordWhitespace(text[cursor - 1] ?? "")) {
    cursor -= 1;
  }
  return cursor;
}
