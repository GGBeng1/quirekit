import type { CanvasPageStackFrame } from "../frames";
import { CanvasPageContentBitmapCache } from "./bitmap-cache";
import {
  CanvasPageContentRetirementTracker,
  createCanvasPageStackContentSurfaceSignature
} from "./retirement";
import { CanvasPageStackContentVersionResolver } from "./signature";
import { QuirePageSurfacePaintValidityCache } from "../../../shared";
import type {
  CanvasPageStackContentPaintCacheOptions,
  CanvasPageStackContentPaintCacheSnapshot,
  CanvasPageStackContentPaintDecision,
  CanvasPageStackContentPaintRequest
} from "./types";

const defaultMaxBitmapBytes = 32 * 1024 * 1024;

/** Coordinates live-surface reuse, bitmap restore, and display-list paint. */
export class CanvasPageStackContentPaintCache {
  /** Canonical live-surface validity shared with other mounted page surfaces. */
  private readonly surfaceValidity =
    new QuirePageSurfacePaintValidityCache<HTMLCanvasElement>();
  /** Exact persistent content version resolver. */
  private readonly versionResolver = new CanvasPageStackContentVersionResolver((version) => this.bitmapCache.delete(version));
  /** Cross-surface persistent page bitmap artifacts. */
  private readonly bitmapCache: CanvasPageContentBitmapCache;
  /** Accepted-pixel generations and retirement candidates for live surfaces. */
  private readonly retirement = new CanvasPageContentRetirementTracker();
  /** Whether the presentation owner has permanently released this cache. */
  private destroyed = false;
  /** Cross-surface bitmap restores completed. */
  private bitmapRestores = 0;
  /** Display lists replayed into page content surfaces. */
  private displayListPaints = 0;
  /** Budget the cache was created with; later budgets never exceed it. */
  private readonly maxBitmapBytes: number;

  /**
   * Creates an empty page content paint cache.
   *
   * @param options - Optional retained bitmap byte budget.
   */
  constructor(options: CanvasPageStackContentPaintCacheOptions = {}) {
    const configuredBudget = options.maxBitmapBytes ?? defaultMaxBitmapBytes;
    const maxBitmapBytes = Number.isFinite(configuredBudget)
      ? Math.max(Math.floor(configuredBudget), 0)
      : defaultMaxBitmapBytes;
    this.maxBitmapBytes = maxBitmapBytes;
    this.bitmapCache = new CanvasPageContentBitmapCache(maxBitmapBytes);
  }

  /**
   * Replaces the retired-bitmap byte budget, capped at the created budget, evicting beyond it.
   *
   * @param maxBytes - Maximum retained RGBA backing-store bytes.
   */
  setMaxBitmapBytes(maxBytes: number): void {
    this.bitmapCache.setMaxBytes(Math.min(maxBytes, this.maxBitmapBytes));
  }

  /**
   * Resolves how one mounted page content surface must be synchronized.
   *
   * @param request - Canonical chunk, paint dependencies, and mounted surface.
   * @returns Skip, restore, or display-list paint decision.
   */
  resolve(request: CanvasPageStackContentPaintRequest): CanvasPageStackContentPaintDecision {
    const contentVersion = this.versionResolver.resolve(request);
    const surfaceEpoch = request.frame.content.dataset.qkContentPaintEpoch ?? "";
    const surfaceValidityEpoch = this.retirement.readValidityEpoch(request.frame.content);
    const validity = this.surfaceValidity.resolve(
      request.frame.content,
      createCanvasPageStackContentSurfaceSignature(
        contentVersion,
        surfaceEpoch,
        surfaceValidityEpoch
      )
    );

    if (validity.action === "reuse") {
      return { action: "skip", contentVersion, surfaceEpoch, surfaceValidityEpoch };
    }
    // A refresh may clear or partially overwrite the canvas before its painter
    // throws. Revoke both the old retirement candidate and live signature first.
    const refreshValidityEpoch = this.retirement.beginRefresh(request.frame.content);
    if (this.bitmapCache.has(contentVersion)) {
      return {
        action: "restore",
        contentVersion,
        surfaceEpoch,
        surfaceValidityEpoch: refreshValidityEpoch
      };
    }
    return {
      action: "paint",
      contentVersion,
      surfaceEpoch,
      surfaceValidityEpoch: refreshValidityEpoch
    };
  }

  /**
   * Resolves synchronization decisions in mounted-frame order.
   *
   * @param requests - Page content requests.
   * @returns Decisions matching request order.
   */
  resolveBatch(
    requests: readonly CanvasPageStackContentPaintRequest[]
  ): readonly CanvasPageStackContentPaintDecision[] {
    return requests.map((request) => this.resolve(request));
  }

  /**
   * Restores a retained bitmap and records the surface as synchronized.
   *
   * @param frame - Mounted page frame receiving the artifact.
   * @param decision - Restore decision returned by {@link resolve}.
   * @returns Whether restore succeeded; false requires display-list fallback.
   */
  restore(
    frame: CanvasPageStackFrame,
    decision: CanvasPageStackContentPaintDecision
  ): boolean {
    if (!this.bitmapCache.restore(decision.contentVersion, frame.content)) {
      return false;
    }
    if (!this.commitSurface(frame, decision)) {
      return false;
    }
    this.bitmapRestores += 1;
    return true;
  }

  /**
   * Commits a successful display-list paint as the next retirement candidate.
   *
   * @param frame - Frame whose content canvas was painted.
   * @param decision - Paint decision returned by {@link resolve}.
   */
  commitPaint(
    frame: CanvasPageStackFrame,
    decision: CanvasPageStackContentPaintDecision
  ): void {
    this.commitSurface(frame, decision);
    this.displayListPaints += 1;
  }

  /**
   * Captures the last accepted version before a live content surface retires.
   *
   * Validation failure deliberately drops the candidate. A later realization
   * can always replay the authoritative page-local display list.
   *
   * @param surface - Content canvas about to detach or clear its backing store.
   * @returns Whether an equivalent retained bitmap is available after retirement.
   */
  retireSurface(surface: HTMLCanvasElement): boolean {
    const candidate = this.retirement.retire(surface);
    if (this.destroyed || candidate === undefined) {
      return false;
    }
    if (this.bitmapCache.has(candidate.contentVersion)) {
      return true;
    }
    return this.bitmapCache.store(candidate.contentVersion, surface);
  }

  /**
   * Invalidates accepted content before a transient painter overwrites a surface.
   *
   * @param surface - Content canvas receiving uncommitted preview pixels.
   */
  invalidateSurface(surface: HTMLCanvasElement): void {
    if (this.destroyed) {
      return;
    }
    this.retirement.beginRefresh(surface);
  }

  /** Releases retained bitmap memory and live-surface validity records. */
  destroy(): void {
    this.destroyed = true;
    this.bitmapCache.clear();
    this.surfaceValidity.reset();
    this.retirement.reset();
  }

  /**
   * Reads cache counters for diagnostics and tests.
   *
   * @returns Snapshot of synchronization and bitmap-cache counters.
   */
  snapshot(): CanvasPageStackContentPaintCacheSnapshot {
    const bitmap = this.bitmapCache.snapshot();
    const validity = this.surfaceValidity.snapshot();
    return {
      liveSurfaceSkips: validity.hits,
      bitmapRestores: this.bitmapRestores,
      displayListPaints: this.displayListPaints,
      bitmapStores: bitmap.stores,
      bitmapReplacements: bitmap.replacements,
      bitmapEvictions: bitmap.evictions,
      oversizedBitmapSkips: bitmap.oversizedSkips,
      retainedBitmapEntries: bitmap.entries,
      retainedBitmapBytes: bitmap.bytes,
      maxBitmapBytes: bitmap.maxBytes
    };
  }

  /**
   * Marks one live surface as containing the resolved content version.
   *
   * @param frame - Synchronized mounted frame.
   * @param decision - Decision carrying content and surface versions.
   * @returns Whether the decision still owned and committed the live surface.
   */
  private commitSurface(
    frame: CanvasPageStackFrame,
    decision: CanvasPageStackContentPaintDecision
  ): boolean {
    if (
      this.destroyed
      || decision.surfaceEpoch !== (frame.content.dataset.qkContentPaintEpoch ?? "")
      || decision.surfaceValidityEpoch !== this.retirement.readValidityEpoch(frame.content)
    ) {
      return false;
    }
    const candidate = {
      contentVersion: decision.contentVersion,
      surfaceEpoch: decision.surfaceEpoch,
      surfaceValidityEpoch: decision.surfaceValidityEpoch,
      width: frame.content.width,
      height: frame.content.height
    };
    if (!this.retirement.commit(frame.content, candidate)) {
      return false;
    }
    this.surfaceValidity.commit(frame.content, {
      action: "refresh",
      signature: createCanvasPageStackContentSurfaceSignature(
        decision.contentVersion,
        decision.surfaceEpoch,
        decision.surfaceValidityEpoch
      )
    });
    return true;
  }
}

/**
 * Creates a page-stack content paint cache.
 *
 * @param options - Optional retained bitmap byte budget.
 * @returns Empty page-stack content paint cache.
 */
export function createCanvasPageStackContentPaintCache(
  options: CanvasPageStackContentPaintCacheOptions = {}
): CanvasPageStackContentPaintCache {
  return new CanvasPageStackContentPaintCache(options);
}
