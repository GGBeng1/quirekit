import type { QuireTableGridTrack } from "../types";
import {
  createQuireTableGridTrackVariantKey,
  trimOldestQuireTableGridVariant
} from "./keys";
import type { QuireTableGridTrackCacheRequest } from "./types";

/** Cumulative diagnostics for retained table grid tracks. */
export interface QuireTableGridTrackCacheCounters {
  /** Structural and geometry cache hits. */
  readonly hits: number;
  /** Structural and geometry cache misses. */
  readonly misses: number;
}

/** Consumer-neutral retained cache for resolved table grid tracks. */
export class QuireTableGridTrackCache {
  private readonly tracksByTable = new Map<
    string,
    Map<string, readonly QuireTableGridTrack[]>
  >();
  private hits = 0;
  private misses = 0;

  /**
   * Creates a bounded grid-track cache.
   *
   * @param maximumVariantsPerTable - Maximum geometry variants per table.
   */
  constructor(private readonly maximumVariantsPerTable = 8) {}

  /**
   * Reads or resolves physical tracks for one structural geometry key.
   *
   * @param request - Canonical grid identity and lazy builder.
   * @returns Retained or newly resolved physical tracks.
   */
  read(request: QuireTableGridTrackCacheRequest): readonly QuireTableGridTrack[] {
    const variantKey = createQuireTableGridTrackVariantKey(request.key);
    let variants = this.tracksByTable.get(request.key.tableId);
    const retained = variants?.get(variantKey);
    if (retained !== undefined) {
      this.hits += 1;
      return retained;
    }

    const tracks = request.build();
    if (variants === undefined) {
      variants = new Map();
      this.tracksByTable.set(request.key.tableId, variants);
    }
    variants.set(variantKey, tracks);
    trimOldestQuireTableGridVariant(
      variants,
      this.maximumVariantsPerTable
    );
    this.misses += 1;
    return tracks;
  }

  /**
   * Removes every geometry variant owned by one table.
   *
   * @param tableId - Stable table identity.
   * @returns Whether any variants were removed.
   */
  deleteTable(tableId: string): boolean {
    return this.tracksByTable.delete(tableId);
  }

  /**
   * Reads cumulative grid-track diagnostics.
   *
   * @returns Current hit and miss counters.
   */
  snapshot(): QuireTableGridTrackCacheCounters {
    return { hits: this.hits, misses: this.misses };
  }
}
