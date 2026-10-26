import type { SuggestionSessionRuntime } from "./state";
import type {
  SuggestionAcceptIntent,
  SuggestionSessionInput,
  SuggestionState,
  SuggestionTarget
} from "./types";

/**
 * Creates mutable runtime facts from one explicit public session input.
 *
 * @param id - Stable controller-generated session identity.
 * @param input - Explicit root, trigger, query, target, and focus return facts.
 * @returns New runtime session with frozen public trigger and target wrappers.
 */
export function createSuggestionSession<Bookmark, Action>(
  id: string,
  input: SuggestionSessionInput<Bookmark>
): SuggestionSessionRuntime<Bookmark, Action> {
  return {
    id,
    root: input.root,
    trigger: Object.freeze({ ...input.trigger }),
    query: input.query,
    target: freezeSuggestionTarget(input.target),
    requestId: 0,
    abortController: undefined,
    providers: [],
    highlightedIndex: null,
    restoreFocus: input.restoreFocus
  };
}

/**
 * Freezes the public target wrapper while leaving its opaque bookmark feature-owned.
 *
 * @param target - Explicit target to retain.
 * @returns Frozen target wrapper.
 */
export function freezeSuggestionTarget<Bookmark>(
  target: SuggestionTarget<Bookmark>
): SuggestionTarget<Bookmark> {
  return Object.freeze({ ...target });
}

/**
 * Resolves the currently highlighted typed action without executing it.
 *
 * @param session - Active explicit session facts.
 * @param state - Current immutable result snapshot.
 * @returns Typed acceptance, or null without a highlighted result.
 */
export function createSuggestionAcceptance<Bookmark, Action>(
  session: SuggestionSessionRuntime<Bookmark, Action>,
  state: SuggestionState<Bookmark, Action>
): SuggestionAcceptIntent<Bookmark, Action> | null {
  const index = state.highlightedIndex;
  const selection = index === null ? undefined : state.results[index];
  if (selection === undefined) return null;
  return Object.freeze({
    sessionId: session.id,
    trigger: session.trigger,
    query: session.query,
    target: session.target,
    selection
  });
}
