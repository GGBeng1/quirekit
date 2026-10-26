import type { CanvasPageContentRetirementCandidate } from "./types";

/** Tracks accepted live pixels until detach, resize, or transient invalidation. */
export class CanvasPageContentRetirementTracker {
  /** Latest accepted candidate for each live content surface. */
  private candidates =
    new WeakMap<HTMLCanvasElement, CanvasPageContentRetirementCandidate>();
  /** Local invalidation epoch for pixels overwritten outside accepted paint. */
  private validityEpochs = new WeakMap<HTMLCanvasElement, number>();

  /**
   * Reads the current cache-local validity epoch.
   *
   * @param surface - Content surface whose generation is needed.
   * @returns Non-negative generation, starting at zero.
   */
  readValidityEpoch(surface: HTMLCanvasElement): number {
    return this.validityEpochs.get(surface) ?? 0;
  }

  /**
   * Revokes accepted pixels before a refresh or transient overwrite begins.
   *
   * @param surface - Content surface about to be mutated.
   * @returns New validity epoch owned by the pending accepted paint.
   */
  beginRefresh(surface: HTMLCanvasElement): number {
    const validityEpoch = this.readValidityEpoch(surface) + 1;
    this.validityEpochs.set(surface, validityEpoch);
    this.candidates.delete(surface);
    return validityEpoch;
  }

  /**
   * Installs a candidate after accepted pixels finish painting.
   *
   * @param surface - Successfully synchronized content surface.
   * @param candidate - Exact version and backing-store facts from the paint decision.
   * @returns Whether the pending decision still owns the live surface.
   */
  commit(
    surface: HTMLCanvasElement,
    candidate: CanvasPageContentRetirementCandidate
  ): boolean {
    if (
      candidate.surfaceEpoch !== (surface.dataset.qkContentPaintEpoch ?? "")
      || candidate.surfaceValidityEpoch !== this.readValidityEpoch(surface)
      || candidate.width !== surface.width
      || candidate.height !== surface.height
    ) {
      this.candidates.delete(surface);
      return false;
    }
    this.candidates.set(surface, candidate);
    return true;
  }

  /**
   * Consumes the candidate if accepted pixels still match the live backing store.
   *
   * @param surface - Content surface about to detach or clear.
   * @returns Valid candidate, or undefined when full repaint must remain the fallback.
   */
  retire(surface: HTMLCanvasElement): CanvasPageContentRetirementCandidate | undefined {
    const candidate = this.candidates.get(surface);
    this.candidates.delete(surface);
    if (
      candidate === undefined
      || candidate.surfaceEpoch !== (surface.dataset.qkContentPaintEpoch ?? "")
      || candidate.surfaceValidityEpoch !== this.readValidityEpoch(surface)
      || candidate.width !== surface.width
      || candidate.height !== surface.height
    ) {
      return undefined;
    }
    return candidate;
  }

  /** Drops all weakly retained candidates and surface-local generations. */
  reset(): void {
    this.candidates = new WeakMap();
    this.validityEpochs = new WeakMap();
  }
}

/**
 * Combines canonical content identity with both live-surface invalidation epochs.
 *
 * @param contentVersion - Registered page content version.
 * @param surfaceEpoch - Mounted canvas clear epoch.
 * @param surfaceValidityEpoch - Cache-local transient-overwrite epoch.
 * @returns Exact live-surface validity signature.
 */
export function createCanvasPageStackContentSurfaceSignature(
  contentVersion: number,
  surfaceEpoch: string,
  surfaceValidityEpoch: number
): string {
  return JSON.stringify([contentVersion, surfaceEpoch, surfaceValidityEpoch]);
}
