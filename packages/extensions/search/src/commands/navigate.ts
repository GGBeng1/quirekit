import { TextSelection, type EditorState, type Transaction } from "@quirekit/pm";
import { resolveSearchScope } from "../match/scan";
import { searchPluginKey } from "../plugin/state";
import type {
  SearchHost,
  SearchMatch,
  SearchMeta,
  SearchScopeSegment
} from "../types";

/** Navigation direction. */
export type SearchDirection = "next" | "previous";

/**
 * Finds the match adjacent to a document range in navigation order, wrapping.
 *
 * The range ranks by the scope segment containing it; matches in earlier or later
 * segments are before or after it regardless of document position.
 *
 * @param matches - Matches in navigation order.
 * @param segments - Ordered scope segments.
 * @param from - Range start, usually the selection start.
 * @param to - Range end, usually the selection end.
 * @param direction - Navigation direction.
 * @returns Adjacent match, or null when there are none.
 */
export function locateAdjacentMatch(
  matches: readonly SearchMatch[],
  segments: readonly SearchScopeSegment[],
  from: number,
  to: number,
  direction: SearchDirection
): SearchMatch | null {
  if (matches.length === 0) return null;
  const anchorRank = rankPosition(from, segments);
  if (direction === "next") {
    return matches.find((match) => {
      const rank = rankPosition(match.from, segments);
      return rank > anchorRank || (rank === anchorRank && match.from >= to);
    }) ?? matches[0]!;
  }
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index]!;
    const rank = rankPosition(match.from, segments);
    if (rank < anchorRank || (rank === anchorRank && match.to <= from)) return match;
  }
  return matches[matches.length - 1]!;
}

/**
 * Selects a match, scrolls it into view, and records it as active.
 *
 * @param tr - Transaction whose document contains `match`.
 * @param match - Match to activate.
 * @param host - Host hooks.
 * @returns The same transaction.
 */
export function activateSearchMatch(
  tr: Transaction,
  match: SearchMatch,
  host: SearchHost
): Transaction {
  tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView();
  host.reveal?.(tr, match);
  return tr.setMeta(searchPluginKey, { type: "activate", match } satisfies SearchMeta);
}

/**
 * Resolves the adjacent match from the current selection.
 *
 * @param state - Editor state.
 * @param matches - Matches in navigation order.
 * @param host - Host hooks.
 * @param direction - Navigation direction.
 * @returns Adjacent match, or null.
 */
export function locateFromSelection(
  state: EditorState,
  matches: readonly SearchMatch[],
  host: SearchHost,
  direction: SearchDirection
): SearchMatch | null {
  const { from, to } = state.selection;
  return locateAdjacentMatch(matches, resolveSearchScope(host, state), from, to, direction);
}

/**
 * Ranks a position by the scope segment that contains it.
 *
 * @param position - Document position.
 * @param segments - Ordered scope segments.
 * @returns Segment index, or -1 outside every segment.
 */
function rankPosition(position: number, segments: readonly SearchScopeSegment[]): number {
  return segments.findIndex((segment) => position >= segment.from && position <= segment.to);
}
