import {
  collectQuireExtensionContributions,
  type QuireAnyExtension
} from "@quirekit/core";
import type { QuireFormattingProvider } from "./types";

/**
 * Collects and validates formatting providers from resolved extensions.
 *
 * @param extensions - Final editor extension order.
 * @param builtin - Coordinator-owned generic provider.
 * @returns Providers in stable order with unique identities.
 */
export function collectFormattingProviders(
  extensions: readonly QuireAnyExtension[],
  builtin: QuireFormattingProvider
): readonly QuireFormattingProvider[] {
  const owned = collectQuireExtensionContributions<QuireFormattingProvider>(
    extensions,
    "addFormattingProviders"
  );
  const providers = [builtin, ...owned.map(entry => entry.contribution)]
    .map((provider, index) => ({ provider, index }))
    .sort((left, right) => (
      (left.provider.order ?? 0) - (right.provider.order ?? 0)
      || left.index - right.index
    ))
    .map(entry => entry.provider);
  const ids = new Set<string>();

  for (const provider of providers) {
    if (ids.has(provider.id)) {
      throw new RangeError(`Duplicate formatting provider id: ${provider.id}`);
    }
    ids.add(provider.id);
  }
  return Object.freeze(providers);
}
