import type { EditorState, Text } from "@quirekit/cm-state";
import type { SearchQuery } from "@quirekit/cm-search";
import type { SearchMatches } from "./types";

/** Matches recorded per query and document; larger results report `limited`. */
export const SEARCH_MATCH_LIMIT = 1000;

/** Match boundaries for one query against one immutable document. */
export interface SearchMatchIndex {
  /** Query the index was built for. */
  readonly query: SearchQuery;
  /** Document the index was built for. */
  readonly doc: Text;
  /** Ascending match starts, at most `SEARCH_MATCH_LIMIT`. */
  readonly starts: readonly number[];
  /** Match ends, aligned with `starts`. */
  readonly ends: readonly number[];
  /** Whether more matches exist beyond the recorded ones. */
  readonly limited: boolean;
}

/**
 * Reuses the index while the query and document are unchanged; otherwise scans once up to the limit.
 * @param state - Current editor state. @param query - Current search query. @param previous - Last index, if any.
 * @returns Index for this query and document.
 */
export function indexSearchMatches(state: EditorState, query: SearchQuery, previous?: SearchMatchIndex): SearchMatchIndex {
  if (previous && previous.doc === state.doc && previous.query.eq(query)) return previous;
  const starts: number[] = [], ends: number[] = [];
  let limited = false;
  if (query.valid) {
    const cursor = query.getCursor(state);
    for (let next = cursor.next(); !next.done; next = cursor.next()) {
      if (starts.length === SEARCH_MATCH_LIMIT) { limited = true; break; }
      starts.push(next.value.from); ends.push(next.value.to);
    }
  }
  return { query, doc: state.doc, starts, ends, limited };
}

/**
 * @param index - Matches for the current query and document. @param from - Main selection start. @param to - Main selection end.
 * @returns Total and the one-based match the selection covers exactly, or 0.
 */
export function readSearchMatches(index: SearchMatchIndex, from: number, to: number): SearchMatches {
  let low = 0, high = index.starts.length - 1, current = 0;
  while (low <= high) {
    const middle = (low + high) >> 1, start = index.starts[middle]!;
    if (start === from) { current = index.ends[middle] === to ? middle + 1 : 0; break; }
    if (start < from) low = middle + 1; else high = middle - 1;
  }
  return { total: index.starts.length, current, limited: index.limited };
}
