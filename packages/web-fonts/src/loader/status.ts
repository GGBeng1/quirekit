import { normalizeQuireWebFontFamily } from "../resource/identity";
import type {
  QuireWebFontFamilyManifest,
  QuireWebFontStatus,
  QuireWebFontStatusPhase
} from "../types";
import type { QuireWebFontError } from "../types";

/** Internal observable status owner. */
export interface QuireWebFontStatusStore {
  /**
   * Reads one family status.
   *
   * @param family - Requested family.
   * @returns Last status or idle.
   */
  get(family: string): QuireWebFontStatus;
  /**
   * Publishes one family phase.
   *
   * @param family - Requested family.
   * @param phase - New lifecycle phase.
   * @param manifest - Optional active candidate.
   * @param error - Optional failure diagnostic.
   */
  publish(
    family: string,
    phase: QuireWebFontStatusPhase,
    manifest?: QuireWebFontFamilyManifest,
    error?: QuireWebFontError
  ): void;
  /**
   * Adds one observer.
   *
   * @param listener - Status listener.
   * @returns Unsubscribe callback.
   */
  subscribe(listener: (status: QuireWebFontStatus) => void): () => void;
  /** Releases observers and stored snapshots. */
  destroy(): void;
}

/**
 * Creates an isolated observable family status store.
 *
 * @param isDestroyed - Loader lifecycle probe used to suppress late work.
 * @returns Status store.
 */
export function createQuireWebFontStatusStore(
  isDestroyed: () => boolean
): QuireWebFontStatusStore {
  const statuses = new Map<string, QuireWebFontStatus>();
  const listeners = new Set<(status: QuireWebFontStatus) => void>();
  return {
    get(family: string): QuireWebFontStatus {
      return statuses.get(normalizeQuireWebFontFamily(family)) ?? {
        family: family.trim(),
        phase: "idle"
      };
    },
    publish(family, phase, manifest, error): void {
      if (isDestroyed()) return;
      const status: QuireWebFontStatus = {
        family: manifest?.family ?? family,
        phase,
        ...(manifest === undefined ? {} : { providerId: manifest.providerId }),
        ...(error === undefined ? {} : { error })
      };
      statuses.set(normalizeQuireWebFontFamily(family), status);
      for (const listener of listeners) {
        try {
          listener(status);
        } catch {
          // One product observer must not break resource readiness.
        }
      }
    },
    subscribe(listener): () => void {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
    destroy(): void {
      listeners.clear();
      statuses.clear();
    }
  };
}
