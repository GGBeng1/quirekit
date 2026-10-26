import type {
  DecorationSet,
  DecorationSource,
  EditorState,
  Transaction
} from "@quirekit/pm";

/** User-adjustable matching options. */
export interface SearchOptions {
  /** Requires exact letter case when true. */
  readonly caseSensitive: boolean;
  /** Requires that neither neighbour of a match is a letter or digit. */
  readonly wholeWord: boolean;
  /** Treats full-width and half-width forms of the same character as equal. */
  readonly ignoreWidth: boolean;
}

/** Committed query text and its matching options. */
export interface SearchQuery {
  /** Literal text to find; never empty for an active query. */
  readonly text: string;
  /** Options applied to every textblock scan. */
  readonly options: SearchOptions;
}

/** One searchable document interval; array order defines navigation wrap order. */
export interface SearchScopeSegment {
  /** First document position inside the interval. */
  readonly from: number;
  /** Document position after the interval. */
  readonly to: number;
  /** Host-defined category such as `body`, `header`, or `footnote`. */
  readonly kind: string;
}

/** Document interval that limits a search, such as the user's selection. */
export interface SearchRange {
  /** First document position inside the interval. */
  readonly from: number;
  /** Document position after the interval. */
  readonly to: number;
}

/** One non-empty match in the current document. */
export interface SearchMatch {
  /** Document position of the first matched character. */
  readonly from: number;
  /** Document position after the last matched character. */
  readonly to: number;
  /** Category of the scope segment that owns this match. */
  readonly segmentKind: string;
}

/** One match with its surrounding textblock text, for result lists. */
export interface SearchMatchSnippet {
  /** Text before the match inside the same textblock. */
  readonly before: string;
  /** Matched text. */
  readonly text: string;
  /** Text after the match inside the same textblock. */
  readonly after: string;
  /** Whether `before` was cut short of the textblock start. */
  readonly truncatedBefore: boolean;
  /** Whether `after` was cut short of the textblock end. */
  readonly truncatedAfter: boolean;
}

/** Host decision on whether one match may be replaced. */
export type SearchReplaceVerdict =
  | {
      /** Match may be replaced. */
      readonly replaceable: true;
    }
  | {
      /** Match must be left unchanged. */
      readonly replaceable: false;
      /** Stable reason code aggregated by product UI. */
      readonly reason: string;
    };

/** Outcome of one replace-all command. */
export interface SearchReplaceAllResult {
  /** Number of matches replaced. */
  readonly replaced: number;
  /** Number of matches rejected by the host. */
  readonly skipped: number;
  /** Number of matches considered. */
  readonly total: number;
  /** Rejected match counts keyed by host reason code. */
  readonly skippedByReason: Readonly<Record<string, number>>;
}

/** Document-semantic hooks injected by the host document profile. */
export interface SearchHost {
  /**
   * Resolves ordered searchable intervals.
   *
   * @param state - Editor state being scanned.
   * @returns Ordered intervals; the whole document when omitted.
   */
  readonly resolveScope?: ((state: EditorState) => readonly SearchScopeSegment[]) | undefined;
  /**
   * Resolves intervals deliberately left out of the scope, used only to count
   * matches the user cannot reach so the UI can say so.
   *
   * @param state - Editor state being scanned.
   * @returns Excluded intervals; none when omitted.
   */
  readonly resolveExcludedScope?: ((state: EditorState) => readonly SearchScopeSegment[]) | undefined;
  /**
   * Decides whether a match may be replaced.
   *
   * @param state - Editor state containing the match.
   * @param match - Candidate match.
   * @returns Replacement verdict; every match is replaceable when omitted.
   */
  readonly checkReplaceable?:
    | ((state: EditorState, match: SearchMatch) => SearchReplaceVerdict)
    | undefined;
  /**
   * Applies host-specific presentation for a newly active match.
   *
   * @param tr - Transaction that already selects the match and scrolls to it.
   * @param match - Active match in the transaction document.
   */
  readonly reveal?: ((tr: Transaction, match: SearchMatch) => void) | undefined;
}

/** CSS colors used by the transient match decorations. */
export interface SearchHighlightStyle {
  /** Background of every match. */
  readonly match: string;
  /** Background of the active match; `transparent` leaves only the editor selection tint. */
  readonly active: string;
  /** Outline of the active match, distinguishable without editor focus. */
  readonly activeOutline: string;
}

/** Options accepted by the Search extension. */
export interface SearchExtensionOptions extends SearchHost {
  /** Highlight colors. */
  readonly highlight: SearchHighlightStyle;
}

/** Derived plugin state; never persisted, collaborated, or recorded in history. */
export interface SearchPluginState {
  /** Committed query, or null while search is inactive. */
  readonly query: SearchQuery | null;
  /** Matches sorted by navigation order. */
  readonly matches: readonly SearchMatch[];
  /** Active match retained as a range so it survives unrelated edits. */
  readonly active: SearchMatch | null;
  /** Decorations for every match. */
  readonly decorations: DecorationSet;
  /** Match decorations combined with the active highlight, cached per state. */
  readonly presentation: DecorationSource;
  /** Last replace-all outcome since the query was committed. */
  readonly lastReplaceAll: SearchReplaceAllResult | null;
  /** Matches inside host-excluded intervals, which navigation and replacement skip. */
  readonly excludedCount: number;
  /** Range the search is limited to, mapped through edits; null for the whole scope. */
  readonly limit: SearchRange | null;
  /** Monotonic counter incremented whenever observable search state changes. */
  readonly version: number;
}

/** Read-only summary consumed by product UI. */
export interface SearchSnapshot {
  /** Committed query, or null while search is inactive. */
  readonly query: SearchQuery | null;
  /** Number of matches. */
  readonly count: number;
  /** Zero-based active match index, or -1. */
  readonly activeIndex: number;
  /** Last replace-all outcome since the query was committed. */
  readonly lastReplaceAll: SearchReplaceAllResult | null;
  /** Matches inside host-excluded intervals, which navigation and replacement skip. */
  readonly excludedCount: number;
  /** Whether the search is limited to a range. */
  readonly limited: boolean;
  /** Observable state version. */
  readonly version: number;
}

/** Transaction metadata understood by the search plugin. */
export type SearchMeta =
  | {
      /** Commits a query and rescans the scope. */
      readonly type: "set";
      /** Query to commit. */
      readonly query: SearchQuery;
      /** Optional range the search is limited to. */
      readonly limit?: SearchRange | undefined;
    }
  | {
      /** Clears query, matches, and decorations. */
      readonly type: "clear";
    }
  | {
      /** Moves the active match. */
      readonly type: "activate";
      /** Active match in the transaction document, or null. */
      readonly match: SearchMatch | null;
    }
  | {
      /** Records a replace-all outcome. */
      readonly type: "replaced-all";
      /** Replace-all outcome. */
      readonly result: SearchReplaceAllResult;
    };

/** Commands installed by the Search extension. */
export type SearchCommandMethods<ReturnType> = {
  /** Commits a query and highlights every match without moving the selection. */
  setSearchQuery: (text: string, options?: Partial<SearchOptions>, limit?: SearchRange) => ReturnType;
  /** Clears the query and every highlight. */
  clearSearch: () => ReturnType;
  /** Selects the next match after the selection, wrapping in scope order. */
  findNext: () => ReturnType;
  /** Selects the previous match before the selection, wrapping in scope order. */
  findPrevious: () => ReturnType;
  /** Selects one match by its zero-based index. */
  selectSearchMatch: (index: number) => ReturnType;
  /** Replaces the selected active match and advances, or locates one first. */
  replaceSearchMatch: (text: string) => ReturnType;
  /** Replaces every replaceable match in one transaction. */
  replaceAllSearchMatches: (text: string) => ReturnType;
};
