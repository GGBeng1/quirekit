// Headless trigger-and-candidate controller shared by every editor product.
export { SuggestionController } from "./controller";
export type { SuggestionControllerOptions } from "./controller-options";
export type {
  ResolvedSuggestionResult,
  SuggestionAcceptIntent,
  SuggestionCancelReason,
  SuggestionKeyboardResult,
  SuggestionOverlayPort,
  SuggestionPhase,
  SuggestionProvider,
  SuggestionProviderPhase,
  SuggestionProviderRequest,
  SuggestionProviderState,
  SuggestionResult,
  SuggestionSessionInput,
  SuggestionState,
  SuggestionStateListener,
  SuggestionTarget,
  SuggestionTrigger,
  SuggestionTriggerKind
} from "./types";
