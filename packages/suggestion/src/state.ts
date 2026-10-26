// Mutable session facts are projected to immutable public snapshots in this module.
import type {
  ResolvedSuggestionResult,
  SuggestionCancelReason,
  SuggestionPhase,
  SuggestionProviderState,
  SuggestionState,
  SuggestionTarget,
  SuggestionTrigger
} from "./types";

/** Mutable provider slot retained only inside one controller session. */
export interface SuggestionProviderSlot<Action> {
  /** Stable provider id. */
  readonly id: string;
  /** Stable result group. */
  readonly group: string;
  /** Current provider request phase. */
  phase: SuggestionProviderState["phase"];
  /** Current provider results. */
  results: readonly ResolvedSuggestionResult<Action>[];
}

/** Mutable session facts projected through an immutable public snapshot. */
export interface SuggestionSessionRuntime<Bookmark, Action> {
  /** Stable active session id. */
  readonly id: string;
  /** Root owning the overlay session. */
  readonly root: object;
  /** Trigger that opened the session. */
  readonly trigger: SuggestionTrigger;
  /** Current committed query. */
  query: string;
  /** Explicit source target. */
  target: SuggestionTarget<Bookmark>;
  /** Current request correlation id. */
  requestId: number;
  /** Current request abort authority. */
  abortController: AbortController | undefined;
  /** Provider slots in declaration order. */
  providers: SuggestionProviderSlot<Action>[];
  /** Current highlighted result index. */
  highlightedIndex: number | null;
  /** Feature-owned focus return callback. */
  readonly restoreFocus: () => void;
}

/**
 * Creates the immutable idle state.
 *
 * @param composing - Current mounted-input composition fact.
 * @param cancelReason - Most recent close reason.
 * @returns Frozen idle snapshot.
 */
export function createIdleSuggestionState<Bookmark, Action>(
  composing: boolean,
  cancelReason: SuggestionCancelReason | null = null
): SuggestionState<Bookmark, Action> {
  return Object.freeze({
    phase: "idle",
    sessionId: null,
    root: null,
    trigger: null,
    query: "",
    target: null,
    requestId: 0,
    providers: Object.freeze([]),
    results: Object.freeze([]),
    highlightedIndex: null,
    composing,
    cancelReason
  });
}

/**
 * Projects one mutable session into an immutable public snapshot.
 *
 * @param session - Active correlated session.
 * @param composing - Current mounted-input composition fact.
 * @returns Frozen state containing detached arrays and provider rows.
 */
export function createSuggestionState<Bookmark, Action>(
  session: SuggestionSessionRuntime<Bookmark, Action>,
  composing: boolean
): SuggestionState<Bookmark, Action> {
  const results = Object.freeze(session.providers.flatMap(({ results: items }) => items));
  const providers = Object.freeze(session.providers.map((provider) => Object.freeze({
    id: provider.id,
    group: provider.group,
    phase: provider.phase,
    ...(provider.phase === "error" ? { errorCode: "provider-failed" as const } : {})
  })));
  return Object.freeze({
    phase: resolveSuggestionPhase(providers, results.length),
    sessionId: session.id,
    root: session.root,
    trigger: session.trigger,
    query: session.query,
    target: session.target,
    requestId: session.requestId,
    providers,
    results,
    highlightedIndex: normalizeSuggestionHighlight(
      session.highlightedIndex,
      results.length
    ),
    composing,
    cancelReason: null
  });
}

/**
 * Resolves the aggregate phase without hiding partial provider failures.
 *
 * @param providers - Current immutable provider rows.
 * @param resultCount - Flattened result count.
 * @returns Aggregate session phase.
 */
function resolveSuggestionPhase(
  providers: readonly SuggestionProviderState[],
  resultCount: number
): SuggestionPhase {
  if (providers.some(({ phase }) => phase === "loading")) return "loading";
  if (resultCount > 0) return "ready";
  if (providers.some(({ phase }) => phase === "error")) return "error";
  return "empty";
}

/**
 * Keeps highlight within the current result set.
 *
 * @param index - Requested highlight.
 * @param resultCount - Current number of results.
 * @returns Valid index, or null for an empty result set.
 */
export function normalizeSuggestionHighlight(
  index: number | null,
  resultCount: number
): number | null {
  if (resultCount === 0) return null;
  if (index === null) return 0;
  return Math.min(Math.max(index, 0), resultCount - 1);
}
