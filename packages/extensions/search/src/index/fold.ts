import type { SearchOptions } from "../types";

/** Comparison text with each folded unit mapped back to its source code point. */
export interface FoldedText {
  /** Text compared against the folded query. */
  readonly text: string;
  /** Source UTF-16 start offset for each folded unit. */
  readonly sourceStart: readonly number[];
  /** Source UTF-16 end offset for each folded unit. */
  readonly sourceEnd: readonly number[];
}

/**
 * Folds source text for comparison, keeping an exact source map.
 *
 * Folding works per code point because case mapping can change length
 * (for example `İ` lowercases to two units), so offsets cannot be assumed equal.
 *
 * @param text - Source text.
 * @param options - Matching options.
 * @returns Folded text and per-unit source ranges.
 */
export function foldSearchText(text: string, options: SearchOptions): FoldedText {
  const parts: string[] = [];
  const sourceStart: number[] = [];
  const sourceEnd: number[] = [];
  let offset = 0;
  for (const codePoint of text) {
    const folded = foldCodePoint(codePoint, options);
    const end = offset + codePoint.length;
    parts.push(folded);
    for (let index = 0; index < folded.length; index += 1) {
      sourceStart.push(offset);
      sourceEnd.push(end);
    }
    offset = end;
  }
  return { text: parts.join(""), sourceStart, sourceEnd };
}

/**
 * Folds a query with the same rules applied to document text.
 *
 * @param text - Query text.
 * @param options - Matching options.
 * @returns Folded query.
 */
export function foldSearchQuery(text: string, options: SearchOptions): string {
  let folded = "";
  for (const codePoint of text) folded += foldCodePoint(codePoint, options);
  return folded;
}

/**
 * Folds one code point.
 *
 * @param codePoint - Single code point string.
 * @param options - Matching options.
 * @returns Folded representation.
 */
function foldCodePoint(codePoint: string, options: SearchOptions): string {
  const width = options.ignoreWidth ? foldWidth(codePoint) : codePoint;
  return options.caseSensitive ? width : width.toLowerCase();
}

/**
 * Maps one code point to its width-neutral form.
 *
 * Only width variants fold; general compatibility forms such as ligatures or
 * superscripts stay distinct. Voiced kana decompose so a full-width `ガ`
 * equals half-width `ｶﾞ`, which is two code points.
 *
 * @param codePoint - Single code point string.
 * @returns Width-neutral representation.
 */
function foldWidth(codePoint: string): string {
  const value = codePoint.codePointAt(0)!;
  if (value === 0x3000) return " ";
  if (value >= 0xff01 && value <= 0xff5e) return String.fromCodePoint(value - 0xfee0);
  if ((value >= 0xff61 && value <= 0xff9f) || (value >= 0xffe0 && value <= 0xffee)) {
    return codePoint.normalize("NFKC");
  }
  if (value >= 0x3040 && value <= 0x30ff) return codePoint.normalize("NFD");
  return codePoint;
}
