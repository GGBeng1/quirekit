/** Basic horizontal Chinese pairs; regional/custom sets remain separate policies. */
const opening = new Set([..."（［｛〔【〖〘〚〈《「『‘“"]);
const closing = new Set([..."，。、；：！？）］｝〕】〗〙〛〉》」』’”"]);

/**
 * Tests a logical source boundary, independently of font and run ownership.
 * Explicit whitespace and hard breaks retain the author's chosen separation.
 * @param left - Last source grapheme before the boundary.
 * @param right - First source grapheme after the boundary.
 * @returns Whether the basic punctuation policy protects this boundary.
 */
export function forbidsPunctuationBreak(left: string, right: string): boolean {
  if (/\s/u.test(left) || /\s/u.test(right)) return false;
  return opening.has(String.fromCodePoint(left.codePointAt(0) ?? 0))
    || closing.has(String.fromCodePoint(right.codePointAt(0) ?? 0));
}
