import type {
  QuireExplicitInteractionOwnerFactsOptions,
  QuireExplicitInteractionOwnerFactsResult,
  QuireInteractionOwnerFactKind
} from "./types";

/**
 * Resolves only owner facts carried explicitly by the current interaction hit.
 *
 * This phase never reads source or capabilities from a query-product root. A
 * partial owner cannot route selection or commands and becomes an explicit gap.
 *
 * @param options - Region, source, and capabilities carried by the exact hit.
 * @returns Complete owner facts or a gap naming every absent fact.
 */
export function resolveQuireExplicitInteractionOwnerFacts(
  options: QuireExplicitInteractionOwnerFactsOptions
): QuireExplicitInteractionOwnerFactsResult {
  const missing: QuireInteractionOwnerFactKind[] = [];

  if (options.region === undefined) {
    missing.push("region");
  }
  if (options.source === undefined) {
    missing.push("source");
  }
  if (options.capabilities === undefined) {
    missing.push("capabilities");
  }

  if (missing.length > 0) {
    return {
      kind: "gap",
      gap: {
        code: "missing-owner-facts",
        missing,
        ...(options.region === undefined ? {} : { region: options.region })
      }
    };
  }

  return {
    kind: "owned",
    region: options.region!,
    source: options.source!,
    capabilities: options.capabilities!
  };
}
