import { QuireMediaAssetValidationError } from "./errors";
import { areQuireMediaReferencesEqual } from "./references";
import type {
  QuireMediaAssetResolver,
  QuireMediaReference,
  QuireResolvedMediaAsset
} from "./types";

/** Ordered resolver composition that preserves explicit acquisition policy. */
class QuireMediaResolverChain implements QuireMediaAssetResolver {
  readonly #resolvers: readonly QuireMediaAssetResolver[];

  /**
   * Captures one stable resolver order.
   *
   * @param resolvers - Host-authorized resolvers from highest to lowest priority.
   */
  constructor(resolvers: readonly QuireMediaAssetResolver[]) {
    this.#resolvers = [...resolvers];
  }

  /**
   * Resolves through the first resolver that can satisfy the reference.
   *
   * @param reference - Stable media identity requested by a consumer.
   * @returns A defensive resolved asset, or undefined when every resolver misses.
   */
  async resolve(
    reference: QuireMediaReference
  ): Promise<QuireResolvedMediaAsset | undefined> {
    for (const resolver of this.#resolvers) {
      const result = await resolver.resolve(reference);
      if (result === undefined) {
        continue;
      }
      if (!areQuireMediaReferencesEqual(reference, result.reference)) {
        throw new QuireMediaAssetValidationError(
          "reference-mismatch",
          "A media resolver returned an asset for a different reference."
        );
      }
      return {
        ...result,
        reference: { ...result.reference },
        bytes: result.bytes.slice(),
        ...(result.intrinsicSize === undefined
          ? {}
          : { intrinsicSize: { ...result.intrinsicSize } })
      };
    }
    return undefined;
  }
}

/**
 * Creates an ordered asynchronous resolver composition.
 *
 * @param resolvers - Host-authorized resolvers from highest to lowest priority.
 * @returns One resolver that stops at the first explicit resolution.
 */
export function createQuireMediaResolverChain(
  resolvers: readonly QuireMediaAssetResolver[]
): QuireMediaAssetResolver {
  return new QuireMediaResolverChain(resolvers);
}
