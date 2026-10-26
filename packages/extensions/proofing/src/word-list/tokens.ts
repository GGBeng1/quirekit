/** One dictionary lookup candidate inside a segment. */
export interface ProofingWordToken {
  /** First UTF-16 offset in the segment. */
  readonly start: number;
  /** Offset after the word. */
  readonly end: number;
  /** Word as passed to the engine, with straight apostrophes. */
  readonly lookup: string;
  /** Abbreviation form tried when the word fails and a period follows it. */
  readonly dotted: string | null;
}

/** Tokenization switches. */
export interface ProofingTokenRules {
  /** Skips words written entirely in capitals. */
  readonly ignoreUppercase: boolean;
  /** Skips words containing digits. */
  readonly ignoreWordsWithNumbers: boolean;
}

/** Web addresses and e-mail addresses, which dictionaries never contain. */
const addressPattern = /(?:https?:\/\/|www\.)[^\s]+|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

/** Scripts a word dictionary cannot check. */
const unspacedPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/** Word segmenters by language tag. */
const segmenters = new Map<string, Intl.Segmenter>();

/**
 * Splits segment text into dictionary lookups.
 *
 * @param text - Segment text.
 * @param language - BCP 47 tag driving word boundaries.
 * @param rules - Tokenization switches.
 * @returns Lookups in text order.
 */
export function tokenizeProofingWords(text: string, language: string, rules: ProofingTokenRules): ProofingWordToken[] {
  const addresses = [...text.matchAll(addressPattern)].map((match) => ({ start: match.index, end: match.index + match[0].length }));
  const tokens: ProofingWordToken[] = [];
  for (const { segment, index, isWordLike } of resolveSegmenter(language).segment(text)) {
    if (isWordLike !== true || !isCheckable(segment, rules)) continue;
    const end = index + segment.length;
    if (addresses.some((address) => index < address.end && end > address.start)) continue;
    const lookup = segment.replaceAll("’", "'");
    tokens.push({ start: index, end, lookup, dotted: text[end] === "." ? `${lookup}.` : null });
  }
  return tokens;
}

/**
 * Applies the skip rules to one word.
 *
 * @param word - Word-like segment.
 * @param rules - Tokenization switches.
 * @returns Whether the word goes to the dictionary.
 */
function isCheckable(word: string, rules: ProofingTokenRules): boolean {
  // Internal periods mark abbreviations and initials such as "e.g" or "U.S", which dictionaries list inconsistently.
  if ([...word].length < 2 || word.includes(".") || unspacedPattern.test(word)) return false;
  if (/\p{N}/u.test(word) && (rules.ignoreWordsWithNumbers || !/\p{L}/u.test(word))) return false;
  if (rules.ignoreUppercase && word === word.toLocaleUpperCase() && word !== word.toLocaleLowerCase()) return false;
  return true;
}

/**
 * Returns a cached word segmenter, falling back to the default locale for invalid tags.
 *
 * @param language - BCP 47 tag.
 * @returns Word segmenter.
 */
function resolveSegmenter(language: string): Intl.Segmenter {
  let segmenter = segmenters.get(language);
  if (segmenter === undefined) {
    try {
      segmenter = new Intl.Segmenter(language, { granularity: "word" });
    } catch {
      segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    }
    segmenters.set(language, segmenter);
  }
  return segmenter;
}
