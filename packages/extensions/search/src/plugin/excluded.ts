import type { EditorState, Transaction } from "@quirekit/pm";
import { diffDocuments } from "../match/incremental";
import { scanSearchScope } from "../match/scan";
import type { SearchExtensionOptions, SearchQuery } from "../types";

/**
 * Counts matches inside host-excluded intervals.
 *
 * @param state - Editor state.
 * @param query - Committed query.
 * @param options - Extension options.
 * @returns Excluded match count.
 */
export function countExcludedMatches(
  state: EditorState,
  query: SearchQuery,
  options: SearchExtensionOptions
): number {
  const excluded = options.resolveExcludedScope?.(state) ?? [];
  return excluded.length === 0 ? 0 : scanSearchScope(state.doc, excluded, query).length;
}

/**
 * Checks whether a transaction touched any excluded interval, so body typing
 * never rescans headers, footers, or notes.
 *
 * @param tr - Document-changing transaction.
 * @param state - New editor state.
 * @param options - Extension options.
 * @returns Whether the excluded count may have changed.
 */
export function excludedRegionChanged(
  tr: Transaction,
  state: EditorState,
  options: SearchExtensionOptions
): boolean {
  if (options.resolveExcludedScope === undefined) return false;
  const diff = diffDocuments(tr);
  if (diff === null) return false;
  return options.resolveExcludedScope(state)
    .some((segment) => diff.start <= segment.to && diff.newEnd >= segment.from);
}
