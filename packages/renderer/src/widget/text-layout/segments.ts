/** One grapheme cluster paired with its character offset in the source text. */
export interface TextGrapheme {
  /** The grapheme cluster text. */
  readonly text: string;
  /** Character offset of the cluster's start within the source text. */
  readonly offset: number;
}

/**
 * Characters each forming a whole extended grapheme cluster that no following
 * character can extend: printable ASCII, tab and line feed (not CR, which joins
 * LF), Latin-1, common punctuation, CJK ideographs, CJK punctuation without the
 * tone marks U+302A–U+302F, common kana without combining voiced marks, and
 * fullwidth ASCII.
 */
const singleUnitGraphemes = /^[\t\n\x20-\x7E\u00A0-\u00FF\u2010-\u2027\u2030-\u205E\u3000-\u3029\u3030-\u303F\u3041-\u3096\u30A1-\u30FA\u30FC-\u30FE\u3400-\u4DBF\u4E00-\u9FFF\uFF01-\uFF5E]*$/u;

/** Platform segmenter shared by every call; constructing one per call is costly. */
let segmenter: Intl.Segmenter | null | undefined;

/**
 * Splits text into grapheme clusters with their source offsets.
 *
 * Uses `Intl.Segmenter` so emoji, combining marks, and other multi-code-point
 * graphemes stay together, falling back to code points where it is unavailable.
 * Text made only of single-unit graphemes is split per code unit directly.
 *
 * @param text - Text to segment.
 * @returns Grapheme clusters in source order, each with its character offset.
 */
export function segmentGraphemes(text: string): readonly TextGrapheme[] {
  const out: TextGrapheme[] = [];

  if (singleUnitGraphemes.test(text)) {
    for (let offset = 0; offset < text.length; offset += 1) {
      out.push({ text: text[offset]!, offset });
    }
    return out;
  }

  segmenter ??= typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
  if (segmenter !== null) {
    for (const segment of segmenter.segment(text)) {
      out.push({ text: segment.segment, offset: segment.index });
    }
    return out;
  }

  let offset = 0;
  for (const character of text) {
    out.push({ text: character, offset });
    offset += character.length;
  }
  return out;
}
