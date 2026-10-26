import type { QuireRect } from "@quirekit/renderer";
import type {
  QuirePageFrame,
  QuirePageStackManager,
  QuirePageStackManagerOptions,
  QuirePageStackSyncOptions,
  QuirePageStackSyncResult
} from "./types";

const defaultMaxPooledFrames = 8;

interface MountedEntry<Surface> {
  readonly surface: Surface;
  pageIndex: number;
  pageRect: QuireRect;
  geometryEpoch: number;
}

/** Surface retained in the detached reuse pool. */
interface PooledSurface<Surface> {
  /** Detached surface bundle available for reuse. */
  readonly surface: Surface;
  /** Estimated bytes held by the detached surface. */
  readonly byteSize: number;
}

/**
 * Reports whether two rectangles describe the same box.
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns Whether the rectangles share all four edges.
 */
function rectsEqual(a: QuireRect, b: QuireRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/**
 * Creates a backend-neutral page-stack manager bound to a host element.
 * @param options - Host, owner document, adapter, and pool size.
 * @returns Manager that mounts only the visible page set.
 */
export function createQuirePageStackManager<Surface>(
  options: QuirePageStackManagerOptions<Surface>
): QuirePageStackManager<Surface> {
  const { host, ownerDocument, adapter } = options;
  const maxPooledFrames = options.maxPooledFrames ?? defaultMaxPooledFrames;
  const maxPooledSurfaceBytes = options.maxPooledSurfaceBytes
    ?? Number.POSITIVE_INFINITY;
  const mounted = new Map<number, MountedEntry<Surface>>();
  const pool: Array<PooledSurface<Surface>> = [];
  let pooledSurfaceBytes = 0;

  /**
   * Reads a non-negative pooled byte estimate for a detached surface.
   * @param surface - Surface entering the pool.
   * @returns Estimated bytes retained while pooled.
   */
  const estimatePooledBytes = (surface: Surface): number => {
    const estimate = adapter.estimatePooledSurfaceBytes?.(surface) ?? 0;
    return Number.isFinite(estimate) ? Math.max(Math.ceil(estimate), 0) : 0;
  };

  /**
   * Evicts the oldest pooled surfaces until count and byte budgets are met.
   * @param byteBudget - Byte budget to meet.
   */
  const trimPoolToBudget = (byteBudget = maxPooledSurfaceBytes): void => {
    while (
      pool.length > 0 &&
      (pool.length > maxPooledFrames || pooledSurfaceBytes > byteBudget)
    ) {
      const dropped = pool.shift()!;
      pooledSurfaceBytes -= dropped.byteSize;
      adapter.dispose?.(dropped.surface);
    }
  };

  const recycle = (surface: Surface): void => {
    adapter.detach(surface);

    if (maxPooledFrames <= 0 || maxPooledSurfaceBytes <= 0) {
      adapter.dispose?.(surface);
      return;
    }

    const entry = {
      surface,
      byteSize: estimatePooledBytes(surface)
    };
    pool.push(entry);
    pooledSurfaceBytes += entry.byteSize;
    trimPoolToBudget();
  };

  const acquire = (): Surface => {
    const entry = pool.pop();

    if (entry !== undefined) {
      pooledSurfaceBytes -= entry.byteSize;
      return entry.surface;
    }

    return adapter.createSurface(ownerDocument);
  };

  const toFrame = (entry: MountedEntry<Surface>): QuirePageFrame<Surface> => ({
    pageIndex: entry.pageIndex,
    pageRect: entry.pageRect,
    surface: entry.surface
  });

  const collectFrames = (): readonly QuirePageFrame<Surface>[] =>
    [...mounted.values()].sort((a, b) => a.pageIndex - b.pageIndex).map(toFrame);

  return {
    sync(syncOptions: QuirePageStackSyncOptions): QuirePageStackSyncResult<Surface> {
      const { pages, visiblePageIndices, geometryEpoch } = syncOptions;
      const visible = new Set(visiblePageIndices);
      const mountedThisSync: QuirePageFrame<Surface>[] = [];

      for (const [pageIndex, entry] of [...mounted]) {
        if (!visible.has(pageIndex)) {
          recycle(entry.surface);
          mounted.delete(pageIndex);
        }
      }

      for (const index of visiblePageIndices) {
        const page = pages[index];
        if (!page) {
          continue;
        }

        const existing = mounted.get(index);
        if (existing) {
          if (
            rectsEqual(existing.pageRect, page.pageRect) &&
            existing.geometryEpoch === geometryEpoch
          ) {
            continue;
          }
          existing.pageRect = page.pageRect;
          existing.geometryEpoch = geometryEpoch;
          adapter.applyGeometry(existing.surface, index, page.pageRect);
          mountedThisSync.push(toFrame(existing));
          continue;
        }

        const surface = acquire();
        adapter.attach(surface, host);
        adapter.applyGeometry(surface, index, page.pageRect);
        const entry: MountedEntry<Surface> = {
          surface,
          pageIndex: index,
          pageRect: page.pageRect,
          geometryEpoch
        };
        mounted.set(index, entry);
        mountedThisSync.push(toFrame(entry));
      }

      // Surfaces left over after this sync's reuse keep only what the retention budget allows.
      const retained = options.readRetainedPoolBytes?.();
      if (retained !== undefined) trimPoolToBudget(Math.min(maxPooledSurfaceBytes, Math.max(retained, 0)));
      return { frames: collectFrames(), mountedThisSync };
    },
    getFrames(): readonly QuirePageFrame<Surface>[] {
      return collectFrames();
    },
    destroy(): void {
      for (const entry of mounted.values()) {
        adapter.detach(entry.surface);
        adapter.dispose?.(entry.surface);
      }
      for (const entry of pool) adapter.dispose?.(entry.surface);
      mounted.clear();
      pool.length = 0;
      pooledSurfaceBytes = 0;
    }
  };
}
