import { resetBitmapTransform, resolveBitmapContext } from "./bitmap-context";

/** One retained page content bitmap and its backing-store estimate. */
interface CanvasPageContentBitmapEntry {
  /** Detached canvas holding the page content bitmap. */
  readonly canvas: HTMLCanvasElement;
  /** Estimated RGBA backing-store bytes. */
  readonly byteSize: number;
}

/** Bitmap-cache counters owned independently from paint decisions. */
export interface CanvasPageContentBitmapCacheSnapshot {
  /** New bitmap artifacts stored. */
  readonly stores: number;
  /** Existing artifacts replaced under the same version. */
  readonly replacements: number;
  /** Least-recently-used artifacts evicted. */
  readonly evictions: number;
  /** Oversized artifacts rejected. */
  readonly oversizedSkips: number;
  /** Artifacts currently retained. */
  readonly entries: number;
  /** Estimated bytes currently retained. */
  readonly bytes: number;
  /** Configured maximum retained bytes. */
  readonly maxBytes: number;
}

/** Byte-budgeted LRU of persistent Canvas page content artifacts. */
export class CanvasPageContentBitmapCache {
  /** Entries in least-to-most-recently-used insertion order. */
  private readonly entries = new Map<number, CanvasPageContentBitmapEntry>();
  /** Estimated bytes currently retained. */
  private retainedBytes = 0;
  /** Successful new stores. */
  private stores = 0;
  /** Same-version replacements. */
  private replacements = 0;
  /** Budget-driven evictions. */
  private evictions = 0;
  /** Artifacts larger than the complete cache budget. */
  private oversizedSkips = 0;

  /**
   * Creates an empty bitmap cache.
   *
   * @param maxBytes - Maximum retained RGBA backing-store bytes.
   */
  constructor(private maxBytes: number) {}

  /**
   * Replaces the byte budget, evicting least recently used bitmaps beyond it.
   *
   * @param maxBytes - Maximum retained RGBA backing-store bytes.
   */
  setMaxBytes(maxBytes: number): void {
    const next = Number.isFinite(maxBytes) ? Math.max(Math.floor(maxBytes), 0) : this.maxBytes;
    if (next === this.maxBytes) return;
    this.maxBytes = next;
    this.trimToBudget(next);
  }

  /**
   * Reports whether a content version has a retained bitmap.
   *
   * @param contentVersion - Registered page content version.
   * @returns Whether a matching artifact exists.
   */
  has(contentVersion: number): boolean {
    return this.entries.has(contentVersion);
  }

  /**
   * Restores one retained artifact into a mounted page canvas.
   *
   * Successful reads promote the artifact to most recently used.
   *
   * @param contentVersion - Registered page content version.
   * @param destination - Mounted page content canvas.
   * @returns Whether the artifact was restored.
   */
  restore(contentVersion: number, destination: HTMLCanvasElement): boolean {
    const entry = this.entries.get(contentVersion);
    if (
      entry === undefined
      || entry.canvas.width !== destination.width
      || entry.canvas.height !== destination.height
    ) {
      return false;
    }
    const target = resolveBitmapContext(destination);
    if (target === undefined) {
      return false;
    }
    resetBitmapTransform(target);
    target.clearRect(0, 0, destination.width, destination.height);
    target.drawImage(entry.canvas, 0, 0);
    this.entries.delete(contentVersion);
    this.entries.set(contentVersion, entry);
    return true;
  }

  /**
   * Captures a painted page canvas under its canonical content version.
   *
   * @param contentVersion - Registered page content version.
   * @param source - Successfully painted mounted page canvas.
   * @returns Whether a bitmap artifact was retained.
   */
  store(contentVersion: number, source: HTMLCanvasElement): boolean {
    const byteSize = source.width * source.height * 4;
    if (byteSize <= 0 || this.maxBytes <= 0) {
      return false;
    }
    if (byteSize > this.maxBytes) {
      this.oversizedSkips += 1;
      return false;
    }
    // Reserve space before copying: a cache budget must also bound the allocation
    // peak, not only the retained entries after a full-page copy has completed.
    const previous = this.entries.get(contentVersion);
    if (previous !== undefined) {
      this.entries.delete(contentVersion);
      this.retainedBytes -= previous.byteSize;
      previous.canvas.width = previous.canvas.height = 0;
    }
    this.trimToBudget(this.maxBytes - byteSize);
    const artifact = source.ownerDocument.createElement("canvas");
    let copied = false;
    try {
      artifact.height = 0;
      artifact.width = source.width;
      artifact.height = source.height;
      const target = resolveBitmapContext(artifact);
      if (target === undefined) return false;
      target.drawImage(source, 0, 0);
      copied = true;
    } finally {
      if (!copied) artifact.width = artifact.height = 0;
    }

    if (previous !== undefined) this.replacements += 1;
    else this.stores += 1;
    this.entries.set(contentVersion, { canvas: artifact, byteSize });
    this.retainedBytes += byteSize;
    return true;
  }

  /** Clears all retained bitmap artifacts. */
  clear(): void {
    for (const entry of this.entries.values()) entry.canvas.width = entry.canvas.height = 0;
    this.entries.clear();
    this.retainedBytes = 0;
  }

  /**
   * Reads bitmap-cache counters and current memory.
   *
   * @returns Immutable bitmap-cache snapshot.
   */
  snapshot(): CanvasPageContentBitmapCacheSnapshot {
    return {
      stores: this.stores,
      replacements: this.replacements,
      evictions: this.evictions,
      oversizedSkips: this.oversizedSkips,
      entries: this.entries.size,
      bytes: this.retainedBytes,
      maxBytes: this.maxBytes
    };
  }

  /**
   * Releases the bitmap of a version that can no longer be resolved.
   *
   * @param contentVersion - Registered page content version.
   */
  delete(contentVersion: number): void {
    this.release(contentVersion);
  }

  /** @param availableBytes - Budget remaining after reserving a pending copy. */
  private trimToBudget(availableBytes: number): void {
    while (this.retainedBytes > availableBytes && this.entries.size > 0) {
      this.release(this.entries.keys().next().value!);
      this.evictions += 1;
    }
  }

  /**
   * Removes one entry and frees its backing store.
   *
   * @param contentVersion - Retained version.
   */
  private release(contentVersion: number): void {
    const entry = this.entries.get(contentVersion);
    if (entry === undefined) return;
    this.entries.delete(contentVersion);
    this.retainedBytes -= entry.byteSize;
    entry.canvas.width = entry.canvas.height = 0;
  }
}
