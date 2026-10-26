import { foldSearchQuery, foldSearchText } from "../index/fold";
import type { IndexedTextblock } from "../index/textblock";
import type { SearchMatch, SearchQuery, SearchScopeSegment } from "../types";

/**
 * Finds non-overlapping literal matches in one indexed textblock.
 *
 * Matching runs on folded text; folded offsets map back to source units and
 * then to document positions. Matches outside the segment are discarded.
 *
 * @param block - Indexed textblock.
 * @param query - Committed query.
 * @param segment - Scope segment that owns the textblock.
 * @returns Matches in document order.
 */
export function findTextblockMatches(
  block: IndexedTextblock,
  query: SearchQuery,
  segment: SearchScopeSegment
): SearchMatch[] {
  const needle = foldSearchQuery(query.text, query.options);
  if (needle.length === 0 || block.text.length === 0) return [];
  const folded = foldSearchText(block.text, query.options);
  const matches: SearchMatch[] = [];
  let index = folded.text.indexOf(needle);
  while (index !== -1) {
    const sourceFrom = folded.sourceStart[index]!;
    const sourceTo = folded.sourceEnd[index + needle.length - 1]!;
    if (query.options.wholeWord && !isWordBounded(block.text, sourceFrom, sourceTo)) {
      // A rejected candidate does not consume text; a later overlapping start may still qualify.
      index = folded.text.indexOf(needle, index + 1);
      continue;
    }
    const from = block.positions[sourceFrom]!;
    const to = block.positions[sourceTo - 1]! + 1;
    if (from >= segment.from && to <= segment.to) {
      matches.push({ from, to, segmentKind: segment.kind });
    }
    index = folded.text.indexOf(needle, index + needle.length);
  }
  return matches;
}

/** Letters and digits in any script. */
const wordCharacter = /[\p{L}\p{N}]/u;

/**
 * Checks that the code points around a source range are not letters or digits.
 *
 * @param text - Source textblock text.
 * @param from - Source start offset.
 * @param to - Source end offset.
 * @returns Whether the range is a whole word.
 */
function isWordBounded(text: string, from: number, to: number): boolean {
  const previous = from === 0
    ? ""
    : text.slice(isLowSurrogate(text.charCodeAt(from - 1)) ? from - 2 : from - 1, from);
  const after = to < text.length ? String.fromCodePoint(text.codePointAt(to)!) : "";
  return !wordCharacter.test(previous) && !wordCharacter.test(after);
}

/**
 * @param code - UTF-16 code unit.
 * @returns Whether the unit is the trailing half of a surrogate pair.
 */
function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}
