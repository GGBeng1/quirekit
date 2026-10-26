import type {
  QuirePageSurfacePaintValidityDecision,
  QuirePageSurfacePaintValiditySnapshot
} from "./types";

/**
 * Owns live-surface signature validity without choosing a backend paint action.
 *
 * Backends resolve every paint dependency into one opaque signature, then
 * commit only after their Canvas paint, bitmap restore, or SVG DOM sync succeeds.
 */
export class QuirePageSurfacePaintValidityCache<Surface extends object> {
  /** Last successfully synchronized signature per live surface. */
  private entries = new WeakMap<Surface, string>();
  /** Number of reusable surface lookups. */
  private hits = 0;
  /** Number of lookups requiring refresh. */
  private misses = 0;
  /** Number of successful refreshes committed by a backend. */
  private stores = 0;

  /**
   * Compares one live surface with an exact backend-owned paint signature.
   *
   * @param surface - Mounted content or overlay surface to inspect.
   * @param signature - Exact signature for every paint-affecting dependency.
   * @returns Reuse or refresh decision carrying the compared signature.
   */
  resolve(
    surface: Surface,
    signature: string
  ): QuirePageSurfacePaintValidityDecision {
    if (this.entries.get(surface) === signature) {
      this.hits += 1;
      return { action: "reuse", signature };
    }

    this.misses += 1;
    return { action: "refresh", signature };
  }

  /**
   * Commits a signature after the backend successfully refreshes the surface.
   *
   * @param surface - Mounted surface that now contains the requested output.
   * @param decision - Earlier decision carrying the synchronized signature.
   */
  commit(
    surface: Surface,
    decision: QuirePageSurfacePaintValidityDecision
  ): void {
    this.entries.set(surface, decision.signature);
    this.stores += 1;
  }

  /**
   * Reads current reuse diagnostics.
   *
   * @returns Hit, miss, and successful-store counters.
   */
  snapshot(): QuirePageSurfacePaintValiditySnapshot {
    return {
      hits: this.hits,
      misses: this.misses,
      stores: this.stores
    };
  }

  /** Clears live-surface validity and diagnostics during owner teardown. */
  reset(): void {
    this.entries = new WeakMap();
    this.hits = 0;
    this.misses = 0;
    this.stores = 0;
  }
}
