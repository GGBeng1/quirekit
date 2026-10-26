import { resolveSuggestionKeyboardCommand } from "./keyboard";
import { createSuggestionAcceptance } from "./session";
import type { SuggestionSessionRuntime } from "./state";
import type { SuggestionAcceptIntent, SuggestionState } from "./types";

/** Pure interaction decision returned to the lifecycle controller. */
export type SuggestionInteraction<Bookmark, Action> =
  | { readonly kind: "ignore" }
  | { readonly kind: "highlight"; readonly index: number | null }
  | {
      readonly kind: "accept";
      readonly acceptance: SuggestionAcceptIntent<Bookmark, Action> | null;
    };

/**
 * Resolves one keyboard key without mutating session state or document content.
 *
 * @param session - Active suggestion session.
 * @param state - Current immutable suggestion snapshot.
 * @param key - Browser keyboard key.
 * @returns Ignore, highlight, or typed acceptance decision.
 */
export function resolveSuggestionInteraction<Bookmark, Action>(
  session: SuggestionSessionRuntime<Bookmark, Action>,
  state: SuggestionState<Bookmark, Action>,
  key: string
): SuggestionInteraction<Bookmark, Action> {
  const command = resolveSuggestionKeyboardCommand(
    key,
    state.highlightedIndex,
    state.results.length
  );
  if (command.kind === "ignore" || command.kind === "overlay-escape") {
    return { kind: "ignore" };
  }
  if (command.kind === "accept") {
    return {
      kind: "accept",
      acceptance: createSuggestionAcceptance(session, state)
    };
  }
  return { kind: "highlight", index: command.index };
}
