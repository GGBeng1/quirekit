/** Small immutable search metadata; never a mirror of the document. */
export interface SearchParameters {
  /** Search text or expression. */
  readonly search: string;
  /** Replacement text, including CM's regexp capture substitutions. */
  readonly replace: string;
  /** Whether matching is case-sensitive. */
  readonly caseSensitive: boolean;
  /** Whether search is a regular expression. */
  readonly regexp: boolean;
  /** Whether matches require word boundaries. */
  readonly wholeWord: boolean;
}

/** Match count for the current query; the selection is "current" only when it covers a match exactly. */
export interface SearchMatches {
  /** Recorded matches, capped at the scan limit. */
  readonly total: number;
  /** One-based match the main selection covers, or 0. */
  readonly current: number;
  /** Whether more matches exist beyond `total`. */
  readonly limited: boolean;
}

/** Search commands keep CM as the only query, selection and transaction owner. */
export type SearchAction = "next" | "previous" | "all" | "replace" | "replaceAll" | "close";

/** Host renderer contract for the existing search panel lifecycle. */
export interface SearchPanelProps {
  /** Current canonical search fields. */
  readonly query: SearchParameters;
  /** Whether the nonempty query can be executed. */
  readonly valid: boolean;
  /** Match count for the current query and document. */
  readonly matches: SearchMatches;
  /** Effective editor permission. */
  readonly readOnly: boolean;
  /** Whether native composition currently owns document or search-field input. */
  readonly composing: boolean;
  /** @param changes - Partial query update. @returns Whether the still-mounted panel accepted it. */
  readonly setQuery: (changes: Partial<SearchParameters>) => boolean;
  /** @param action - Explicit search intent. @returns Whether the action was applicable. */
  readonly run: (action: SearchAction) => boolean;
  /** @param key - CM phrase key. @returns Host-localized label. */
  readonly phrase: (key: string) => string;
}
