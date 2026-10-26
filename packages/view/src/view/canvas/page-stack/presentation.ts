import { MountedPageStackPresentation } from "../../shared/page-stack/presentation";
import type { QuireViewRenderResult } from "../../types";
import {
  createMountedPaginatedSurfaceLifecycle,
  shouldRefreshQuirePageStackDisplayListClip,
  type MountedPaginatedSurfaceLifecycle,
  type QuirePageFrame,
  type QuirePageStackDisplayListChunkIndex,
  type QuirePageStackFillPresentationLifecycle,
} from "../../shared";
import { resolveCanvasMountedScrollSource } from "../scroll-source";
import { canvasPageFrame, createCanvasPageSurfaceAdapter } from "./adapter";
import {
  createCanvasPageStackContentPaintCache,
  type CanvasPageStackContentPaintCacheSnapshot
} from "./content-paint";
import { createCanvasPageStackOverlayPaintCache } from "./overlay-paint-cache";
import { releaseCanvasPageOverlayTiles } from "./overlay-tiles";
import { createCanvasPageStackFillLifecycle } from "./fill";
import type { CanvasPageStackFrameElements } from "./frames";
import {
  renderCanvasPageStack,
  repaintCanvasPageStackContents,
  repaintCanvasPageStackOverlays
} from "./render";
import type { CreateCanvasPageStackPresentationOptions } from "./types";

/** Detached page surfaces kept for reuse; a window shift recycles and acquires in one pass. */
const CANVAS_PAGE_STACK_POOL = { maxPooledFrames: 2, maxPooledSurfaceBytes: 32 * 1024 * 1024 };

/**
 * Owns backend presentation resources for one mounted Canvas page stack.
 *
 * Document compilation remains in the mount orchestrator. This resource owns
 * only the paginated presentation lifetime: page snapshot, sparse frames,
 * geometry epoch, paint caches, viewport realization, and reverse-order cleanup.
 */
export class CanvasPageStackPresentation extends MountedPageStackPresentation<CanvasPageStackFrameElements> {
  /** Canonical viewport and sparse-frame lifecycle. */
  protected readonly lifecycle: MountedPaginatedSurfaceLifecycle<CanvasPageStackFrameElements>;
  /** Viewport-first fill policy and scheduler owned by this presentation. */
  protected readonly fillLifecycle: QuirePageStackFillPresentationLifecycle;
  /** Persistent page-content paint cache. */
  private readonly contentPaintCache = createCanvasPageStackContentPaintCache();
  /** Transient page-overlay paint cache. */
  private readonly overlayPaintCache = createCanvasPageStackOverlayPaintCache();
  /** DPR used by the latest applied frame geometry. */
  private devicePixelRatio = 0;
  /** Geometry generation changed whenever DPR changes. */
  private geometryEpoch = 0;
  /** Whether reverse-order presentation teardown has started. */
  private destroyed = false;

  /**
   * Creates one Canvas page-stack presentation resource.
   *
   * @param options - Host, runtime policy, and document-product callbacks.
   */
  constructor(private readonly options: CreateCanvasPageStackPresentationOptions) {
    super();
    this.lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: resolveCanvasMountedScrollSource({
        root: options.root,
        runtime: options.runtime
      }),
      host: options.host,
      ownerDocument: options.root.ownerDocument,
      adapter: createCanvasPageSurfaceAdapter(
        () => this.devicePixelRatio,
        (surface) => {
          releaseCanvasPageOverlayTiles(surface.parentElement);
          if (!this.destroyed) {
            this.contentPaintCache.retireSurface(surface);
          }
        }
      ),
      ...CANVAS_PAGE_STACK_POOL,
      readRetainedPoolBytes: () => this.screenBytes(this.devicePixelRatio),
      readBufferPages: () => options.runtime?.scrollBufferPages ?? 1,
      readGeometryEpoch: () => this.geometryEpoch,
      shouldRequestDocumentRefresh: ({ pageRects, visiblePageIndices }) =>
        shouldRefreshQuirePageStackDisplayListClip({
          pageRects,
          visiblePageIndices,
          clipRects: this.displayListClipRects
        }),
      requestDocumentRefresh: options.requestDocumentRefresh,
      realizeViewport: ({ realizedFrames }) => {
        const state = options.readRenderState();

        if (realizedFrames.length === 0 || state === null) {
          return;
        }

        this.paintFrames(
          realizedFrames,
          state.renderResult,
          state.surfaceState.devicePixelRatio
        );
      },
      onVisiblePagesChange: (visiblePageIndices) => {
        options.onMountedPagesChange?.(visiblePageIndices);
        options.runtime?.onVisiblePagesChange?.(visiblePageIndices);
      }
    });
    this.fillLifecycle = createCanvasPageStackFillLifecycle({
      root: options.root,
      runtime: options.runtime,
      fill: options.fill,
      readVisibleHeight: () => this.lifecycle.getVisibleRegion().height,
      syncViewport: () => {
        this.lifecycle.syncViewport(0);
      },
      isAvailable: () => !this.destroyed
    });
  }

  /**
   * Bytes of one screen of device pixels, which bounds the page pixels kept off screen: recycled
   * surfaces between syncs and retired page bitmaps. A page larger than a screen is not kept.
   *
   * @param devicePixelRatio - Backing-store pixels per document unit.
   * @returns RGBA bytes of the visible region at that scale.
   */
  private screenBytes(devicePixelRatio: number): number {
    const region = this.lifecycle.getVisibleRegion();
    return Math.ceil(region.width * devicePixelRatio) * Math.ceil(region.height * devicePixelRatio) * 4;
  }

  /**
   * Advances the geometry epoch when Canvas backing-store scale changes.
   *
   * @param devicePixelRatio - DPR used by the current render pass.
   */
  updateDevicePixelRatio(devicePixelRatio: number): void {
    if (devicePixelRatio === this.devicePixelRatio) {
      return;
    }

    this.devicePixelRatio = devicePixelRatio;
    this.geometryEpoch += 1;
  }

  /**
   * Paints full content and overlay products into supplied frames.
   *
   * @param frames - Mounted frames requiring synchronization.
   * @param renderResult - Authoritative document-space render products.
   * @param devicePixelRatio - DPR applied to page backing stores.
   */
  paintFrames(
    frames: readonly QuirePageFrame<CanvasPageStackFrameElements>[],
    renderResult: QuireViewRenderResult,
    devicePixelRatio: number
  ): void {
    this.contentPaintCache.setMaxBitmapBytes(this.screenBytes(devicePixelRatio));
    renderCanvasPageStack({
      frames: frames.map(canvasPageFrame),
      renderResult,
      devicePixelRatio,
      contentPaintCache: this.contentPaintCache,
      overlayPaintCache: this.overlayPaintCache,
      ...(this.options.runtime?.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: this.options.runtime.glyphRunPainter })
    });
    this.lifecycle.markPainted(frames);
  }

  /**
   * Repaints transient overlays while retaining page content.
   *
   * @param pageDisplayListChunks - Authoritative page-local display chunks.
   * @param devicePixelRatio - DPR applied to page backing stores.
   * @param caretVisible - Whether caret commands should remain visible.
   */
  repaintOverlays(
    pageDisplayListChunks: QuirePageStackDisplayListChunkIndex,
    devicePixelRatio: number,
    caretVisible: boolean
  ): void {
    repaintCanvasPageStackOverlays({
      frames: this.lifecycle.getFrames().map(canvasPageFrame),
      pageDisplayListChunks,
      devicePixelRatio,
      caretVisible,
      overlayPaintCache: this.overlayPaintCache,
      ...(this.options.runtime?.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: this.options.runtime.glyphRunPainter })
    });
  }

  /**
   * Repaints transient drawing content and chrome without committing paint caches.
   *
   * @param renderResult - Transient page-local render products.
   * @param devicePixelRatio - DPR applied to page backing stores.
   * @param caretVisible - Whether caret commands should remain visible.
   */
  repaintDrawingPreview(
    renderResult: QuireViewRenderResult,
    devicePixelRatio: number,
    caretVisible: boolean
  ): void {
    // A resize can remove a trailing page. Present the speculative page set as
    // well as its pixels; cancellation calls this same path with accepted pages.
    const frames = this.replacePages(renderResult.layoutSnapshot.pages ?? [], this.options.runtime?.scrollBufferPages ?? 1).map(canvasPageFrame);
    for (const frame of frames) {
      this.contentPaintCache.invalidateSurface(frame.content);
    }
    repaintCanvasPageStackContents({
      frames,
      renderResult,
      devicePixelRatio,
      ...(this.options.runtime?.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: this.options.runtime.glyphRunPainter })
    });
    const chunks = renderResult.pageDisplayListChunks;
    if (chunks === undefined) {
      throw new RangeError(
        "Mounted drawing preview requires pageDisplayListChunks."
      );
    }
    this.repaintOverlays(chunks, devicePixelRatio, caretVisible);
    this.lifecycle.markPainted(this.lifecycle.getFrames());
  }

  /**
   * Reads content cache diagnostics for mounted render events.
   *
   * @returns Current page-content cache counters.
   */
  snapshotContentPaintCache(): CanvasPageStackContentPaintCacheSnapshot {
    return this.contentPaintCache.snapshot();
  }

  /** Releases viewport subscription, frames, pool, and Canvas paint caches. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.fillLifecycle.destroy();
    this.lifecycle.destroy();
    this.contentPaintCache.destroy();
    this.overlayPaintCache.destroy();
  }
}

/**
 * Creates one mounted Canvas page-stack presentation resource.
 *
 * @param options - Host, runtime policy, and document-product callbacks.
 * @returns Owned Canvas page-stack presentation resource.
 */
export function createCanvasPageStackPresentation(
  options: CreateCanvasPageStackPresentationOptions
): CanvasPageStackPresentation {
  return new CanvasPageStackPresentation(options);
}
