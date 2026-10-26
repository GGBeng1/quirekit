import type {
  QuireInlineSourceActivationMetadata,
  QuireInlineSourceCapabilityRegistry,
  QuireInlineSourceCapabilityResolver
} from "./types";

/**
 * Creates an exact-node-type source-capability registry.
 *
 * Duplicate claims fail at construction so resolver order can never become an
 * accidental precedence rule.
 *
 * @param resolvers - Internal capability resolvers to install.
 * @param occurrenceValues - Candidate text keyed by source anchor before measurement.
 * @returns Immutable resolver registry for one snapshot compilation.
 */
export function createQuireInlineSourceCapabilityRegistry<TActivation extends QuireInlineSourceActivationMetadata = never>(
  resolvers: readonly QuireInlineSourceCapabilityResolver<TActivation>[],
  occurrenceValues?: ReadonlyMap<string, string>
): QuireInlineSourceCapabilityRegistry<TActivation> {
  const byNodeType = new Map<string, QuireInlineSourceCapabilityResolver<TActivation>>();

  for (const resolver of resolvers) {
    if (byNodeType.has(resolver.nodeType)) {
      throw new RangeError(
        `Duplicate inline source-capability resolver for "${resolver.nodeType}".`
      );
    }
    byNodeType.set(resolver.nodeType, resolver);
  }

  return {
    /** @param input - Immutable source and accepted typography. @returns Exact semantic product with a measurement-only candidate, or no claim. */
    resolve(input) {
      // Candidate text belongs to this measurement pass; canonical attrs and
      // source identity remain untouched before the semantic resolver runs.
      const value = input.sourceAnchorId === undefined ? undefined : occurrenceValues?.get(input.sourceAnchorId);
      return byNodeType.get(input.nodeType)?.resolve(value === undefined ? input : { ...input, occurrenceValue: value });
    }
  };
}
