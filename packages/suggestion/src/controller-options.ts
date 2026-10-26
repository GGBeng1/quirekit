import type { SuggestionOverlayPort, SuggestionProvider } from "./types";

/** Construction contract for one command-neutral suggestion controller. */
export interface SuggestionControllerOptions<Bookmark, Action> {
  /** Ordered providers shared by slash, mention, and emoji triggers. */
  readonly providers: readonly SuggestionProvider<Bookmark, Action>[];
  /** Canonical root-local overlay adapter. */
  readonly overlay: SuggestionOverlayPort;
}
