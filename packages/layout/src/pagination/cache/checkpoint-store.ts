import type { QuireMeasuredContainer } from "../container";
import {
  isQuirePaginationItemAnchorAligned,
  rebaseQuirePaginationCheckpoint,
  type QuirePaginationCheckpointReusePlan,
  type QuirePaginationCheckpointStore,
  type QuirePaginationCheckpointStoreReadOptions,
  type QuirePaginationCheckpointStoreWriteOptions,
  type QuirePaginationPageRecord
} from "../checkpoint";

/** Observable counters for one retained pagination checkpoint store. */
export interface QuirePaginationCheckpointStoreCounters {
  /** Number of successful unchanged-prefix reads. */
  readonly prefixHits: number;
  /** Number of reads without a reusable unchanged prefix. */
  readonly prefixMisses: number;
  /** Number of retained prefix pages reused. */
  readonly prefixPagesReused: number;
  /** Number of passes that converged with a previous downstream checkpoint. */
  readonly convergenceHits: number;
  /** Number of incremental passes that did not converge before completion. */
  readonly convergenceMisses: number;
  /** Number of retained suffix pages reused after convergence. */
  readonly suffixPagesReused: number;
  /** Number of pages actually recomputed by the page driver. */
  readonly pagesRecomputed: number;
  /** Number of complete checkpoint streams committed. */
  readonly stores: number;
}

/** Stored checkpoint stream for one geometry and pagination-policy key. */
interface QuirePaginationCheckpointStoreEntry {
  /** Geometry and pagination-policy key. */
  readonly geometryKey: string;
  /** Complete retained page stream. */
  readonly records: readonly QuirePaginationPageRecord[];
}

/**
 * Retains one previous renderer-neutral pagination checkpoint stream.
 *
 * The store validates only unchanged prefix pages. Downstream convergence is
 * owned by the page driver because it alone owns page progression and knows
 * when a newly produced boundary is authoritative.
 */
export class QuireRetainedPaginationCheckpointStore
implements QuirePaginationCheckpointStore {
  /** Last complete checkpoint stream. */
  private entry: QuirePaginationCheckpointStoreEntry | null = null;

  /** Successful prefix reuse count. */
  private prefixHits = 0;

  /** Prefix miss count. */
  private prefixMisses = 0;

  /** Total prefix pages reused. */
  private prefixPagesReused = 0;

  /** Successful convergence count. */
  private convergenceHits = 0;

  /** Failed convergence count. */
  private convergenceMisses = 0;

  /** Total suffix pages reused. */
  private suffixPagesReused = 0;

  /** Total pages recomputed by the page driver. */
  private pagesRecomputed = 0;

  /** Completed stream store count. */
  private stores = 0;

  /**
   * Reads the previous stream and validates the unchanged prefix.
   *
   * @param options - Current measured container, dirty range, and geometry key.
   * @returns Previous stream plus reusable prefix, or null when the stream is incompatible.
   */
  read(
    options: QuirePaginationCheckpointStoreReadOptions
  ): QuirePaginationCheckpointReusePlan | null {
    if (
      this.entry === null ||
      this.entry.geometryKey !== options.geometryKey
    ) {
      this.prefixMisses += 1;
      return null;
    }

    const prefix: QuirePaginationPageRecord[] = [];
    for (let index = 0; index < this.entry.records.length; index += 1) {
      const record = this.entry.records[index]!;
      if (record.fragment.range.to > options.dirtyRange.from) {
        break;
      }
      if (!isQuirePaginationPrefixPageAligned(record, options.container)) {
        break;
      }
      if (record.end === null) {
        break;
      }
      const rebasedEnd = rebaseQuirePaginationCheckpoint(
        record.end,
        options.container,
        (record.endItem?.index ?? record.start.nextItem.index) + 1
      );
      if (rebasedEnd === undefined) {
        break;
      }
      prefix.push({ ...record, end: rebasedEnd });
    }

    const resume = prefix[prefix.length - 1]?.end ?? undefined;
    if (prefix.length === 0 || resume === undefined || resume === null) {
      this.prefixMisses += 1;
    } else {
      this.prefixHits += 1;
      this.prefixPagesReused += prefix.length;
    }

    return {
      prefix,
      ...(resume === undefined || resume === null ? {} : { resume }),
      previous: this.entry.records,
      firstAffectedPageIndex: resume?.pageIndex ?? 0
    };
  }

  /**
   * Commits one completed checkpoint stream.
   *
   * @param options - Current measured container, geometry key, and records.
   * @returns Nothing.
   */
  write(options: QuirePaginationCheckpointStoreWriteOptions): void {
    this.entry = {
      geometryKey: options.geometryKey,
      records: options.records
    };
    this.stores += 1;
    this.pagesRecomputed += options.recomputedPages;
    if (options.suffixPagesReused > 0) {
      this.convergenceHits += 1;
      this.suffixPagesReused += options.suffixPagesReused;
      return;
    }
    if (options.convergenceAttempted) {
      this.convergenceMisses += 1;
    }
  }

  /**
   * Returns observable checkpoint-store counters.
   *
   * @returns Current prefix, convergence, suffix, and store counters.
   */
  snapshot(): QuirePaginationCheckpointStoreCounters {
    return {
      prefixHits: this.prefixHits,
      prefixMisses: this.prefixMisses,
      prefixPagesReused: this.prefixPagesReused,
      convergenceHits: this.convergenceHits,
      convergenceMisses: this.convergenceMisses,
      suffixPagesReused: this.suffixPagesReused,
      pagesRecomputed: this.pagesRecomputed,
      stores: this.stores
    };
  }

  /**
   * Drops the retained stream and resets counters.
   *
   * @returns Nothing.
   */
  clear(): void {
    this.entry = null;
    this.prefixHits = 0;
    this.prefixMisses = 0;
    this.prefixPagesReused = 0;
    this.convergenceHits = 0;
    this.convergenceMisses = 0;
    this.suffixPagesReused = 0;
    this.pagesRecomputed = 0;
    this.stores = 0;
  }
}

/**
 * Creates an empty retained pagination checkpoint store.
 *
 * @returns Empty checkpoint store.
 */
export function createQuirePaginationCheckpointStore(): QuireRetainedPaginationCheckpointStore {
  return new QuireRetainedPaginationCheckpointStore();
}

/**
 * Checks whether all measured-item anchors in one retained page still align.
 *
 * @param record - Retained page record.
 * @param container - Current measured container.
 * @returns Whether the page boundary and final accepted item still align.
 */
function isQuirePaginationPrefixPageAligned(
  record: QuirePaginationPageRecord,
  container: QuireMeasuredContainer
): boolean {
  return isQuirePaginationItemAnchorAligned(record.start.nextItem, container) &&
    (record.endItem === undefined ||
      isQuirePaginationItemAnchorAligned(record.endItem, container));
}
