// Provider validation and normalization stay independent of product catalogs.
import type {
  ResolvedSuggestionResult,
  SuggestionProvider,
  SuggestionResult,
  SuggestionTriggerKind
} from "./types";
import type { SuggestionProviderSlot } from "./state";

/**
 * Validates deterministic provider identities at controller construction.
 *
 * @param providers - Provider declarations supplied by one product instance.
 */
export function validateSuggestionProviders<Bookmark, Action>(
  providers: readonly SuggestionProvider<Bookmark, Action>[]
): void {
  const ids = new Set<string>();
  for (const provider of providers) {
    if (provider.id.trim().length === 0) {
      throw new RangeError("Suggestion provider ids must not be empty.");
    }
    if (ids.has(provider.id)) {
      throw new RangeError(`Duplicate suggestion provider id: ${provider.id}`);
    }
    if (provider.group.trim().length === 0) {
      throw new RangeError(`Suggestion provider "${provider.id}" needs a group.`);
    }
    ids.add(provider.id);
  }
}

/**
 * Creates loading slots for providers accepting one trigger.
 *
 * @param providers - Validated provider declarations.
 * @param trigger - Active trigger family.
 * @returns Mutable slots in declaration order.
 */
export function createSuggestionProviderSlots<Bookmark, Action>(
  providers: readonly SuggestionProvider<Bookmark, Action>[],
  trigger: SuggestionTriggerKind
): SuggestionProviderSlot<Action>[] {
  return providers
    .filter((provider) => provider.trigger === trigger)
    .map((provider) => ({
      id: provider.id,
      group: provider.group,
      phase: "loading",
      results: Object.freeze([])
    }));
}

/**
 * Validates provider result identities and adds collision-free controller keys.
 *
 * @param provider - Provider owning the returned results.
 * @param results - Ordered provider results.
 * @returns Frozen resolved rows.
 */
export function resolveSuggestionProviderResults<Bookmark, Action>(
  provider: SuggestionProvider<Bookmark, Action>,
  results: readonly SuggestionResult<Action>[]
): readonly ResolvedSuggestionResult<Action>[] {
  const ids = new Set<string>();
  return Object.freeze(results.map((result) => {
    if (result.id.trim().length === 0) {
      throw new RangeError(`Suggestion provider "${provider.id}" returned an empty id.`);
    }
    if (ids.has(result.id)) {
      throw new RangeError(
        `Suggestion provider "${provider.id}" returned duplicate id: ${result.id}`
      );
    }
    ids.add(result.id);
    return Object.freeze({
      key: `${provider.id}:${result.id}`,
      providerId: provider.id,
      group: provider.group,
      result
    });
  }));
}
