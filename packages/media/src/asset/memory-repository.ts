import { QuireMediaAssetConflictError } from "./errors";
import { areNormalizedQuireMediaAssetsEqual } from "./equality";
import { createQuireAssetMediaReference } from "./references";
import type {
  QuireAssetMediaReference,
  QuireMediaAssetInput,
  QuireMediaAssetLease,
  QuireMediaReference,
  QuireMediaRepository,
  QuireResolvedMediaAsset
} from "./types";
import {
  cloneQuireResolvedMediaAsset,
  normalizeQuireMediaAssetInput,
  type NormalizedQuireMediaAsset
} from "./validation";

type StoredMemoryAsset = {
  readonly asset: NormalizedQuireMediaAsset;
  accepted: boolean;
  leases: number;
};

/** In-memory reference implementation with host-neutral lifecycle semantics. */
class QuireMemoryMediaRepository implements QuireMediaRepository {
  readonly #assets = new Map<string, StoredMemoryAsset>();

  /**
   * Creates a repository and registers its initial complete assets.
   *
   * @param initialAssets - Optional assets registered in deterministic order.
   */
  constructor(initialAssets: readonly QuireMediaAssetInput[]) {
    for (const asset of initialAssets) {
      this.put(asset);
    }
  }

  /**
   * Registers one complete asset with exact idempotency semantics.
   *
   * @param input - Stable identity, portable bytes, and metadata.
   * @returns The canonical asset reference.
   */
  put(input: QuireMediaAssetInput): QuireAssetMediaReference {
    const lease = this.register(input);
    lease.accept();
    return lease.reference;
  }

  /**
   * Registers one asset and returns ownership of only a newly created entry.
   *
   * @param input - Stable identity, portable bytes, and metadata.
   * @returns One-shot authoring lease.
   */
  register(input: QuireMediaAssetInput): QuireMediaAssetLease {
    const normalized = normalizeQuireMediaAssetInput(input);
    const existing = this.#assets.get(normalized.assetId);
    if (
      existing !== undefined &&
      !areNormalizedQuireMediaAssetsEqual(existing.asset, normalized)
    ) {
      throw new QuireMediaAssetConflictError(normalized.assetId);
    }
    const stored = existing ?? { asset: normalized, accepted: false, leases: 0 };
    if (existing === undefined) this.#assets.set(normalized.assetId, stored);
    stored.leases += 1;
    const reference = createQuireAssetMediaReference(normalized.assetId);
    let settled = false;
    return Object.freeze({
      reference,
      accept: (): boolean => {
        if (settled) return false;
        settled = true;
        stored.leases -= 1;
        stored.accepted = true;
        return true;
      },
      rollback: (): boolean => {
        if (settled) return false;
        settled = true;
        stored.leases -= 1;
        if (
          stored.accepted
          || stored.leases > 0
          || this.#assets.get(normalized.assetId) !== stored
        ) {
          return false;
        }
        return this.#assets.delete(normalized.assetId);
      }
    });
  }

  /**
   * Resolves only repository-owned asset references and never fetches externals.
   *
   * @param reference - Stable reference requested by a consumer.
   * @returns A defensive resolved copy, or undefined when unavailable.
   */
  resolve(reference: QuireMediaReference): QuireResolvedMediaAsset | undefined {
    if (reference.kind === "external") {
      return undefined;
    }
    const asset = this.#assets.get(reference.assetId);
    return asset === undefined
      ? undefined
      : cloneQuireResolvedMediaAsset(asset.asset);
  }

  /**
   * Reports whether one stable asset id is registered.
   *
   * @param assetId - Stable host-defined identifier.
   * @returns True when the repository contains the asset.
   */
  has(assetId: string): boolean {
    return this.#assets.has(assetId);
  }
}

/**
 * Creates the host-neutral in-memory media repository.
 *
 * @param initialAssets - Optional complete assets registered immediately.
 * @returns A repository with defensive byte-copy and collision semantics.
 */
export function createQuireMemoryMediaRepository(
  initialAssets: readonly QuireMediaAssetInput[] = []
): QuireMediaRepository {
  return new QuireMemoryMediaRepository(initialAssets);
}
