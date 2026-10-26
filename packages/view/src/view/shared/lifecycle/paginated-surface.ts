import { createQuirePageStackManager } from "../page-stack";
import { PageStackPlaceholders } from "../page-stack/loading/placeholders";
import { PageStackViewportTask } from "../page-stack/loading/viewport-task";
import { resolvePagePreparationWindow } from "../page-stack/loading/window";
import type { QuireLayoutPage } from "@quirekit/view-engine";
import {
  createViewportCoordinator,
  resolveMountedVisiblePageIndices
} from "../viewport";
import type {
  CreateMountedPaginatedSurfaceLifecycleOptions,
  MountedPaginatedSurfaceLifecycle,
  MountedPaginatedSurfaceRealization,
  MountedPaginatedSurfaceViewportState,
  ReplaceMountedPaginatedSurfacePagesOptions
} from "./types";

/**
 * Creates the canonical viewport and mounted-page lifetime for one paginated view.
 *
 * Backends supply surface construction and paint or geometry effects. This
 * lifecycle owns the page snapshot, viewport subscription, sparse page-stack
 * manager, and teardown ordering that must remain identical across Canvas and
 * SVG.
 *
 * @param options - Scroll, surface, geometry, refresh, and realization adapters.
 * @returns Canonical paginated-surface lifecycle.
 */
export function createMountedPaginatedSurfaceLifecycle<Surface>(
  options: CreateMountedPaginatedSurfaceLifecycleOptions<Surface>
): MountedPaginatedSurfaceLifecycle<Surface> {
  const coordinator = createViewportCoordinator({
    scrollSource: options.scrollSource
  });
  const placeholders = new PageStackPlaceholders(options.host, options.ownerDocument);
  const manager = createQuirePageStackManager({
    host: options.host,
    ownerDocument: options.ownerDocument,
    adapter: options.adapter,
    ...(options.maxPooledFrames === undefined
      ? {}
      : { maxPooledFrames: options.maxPooledFrames }),
    ...(options.maxPooledSurfaceBytes === undefined
      ? {}
      : { maxPooledSurfaceBytes: options.maxPooledSurfaceBytes }),
    ...(options.readRetainedPoolBytes === undefined
      ? {}
      : { readRetainedPoolBytes: options.readRetainedPoolBytes })
  });
  let pages: readonly QuireLayoutPage[] = [];
  let pageRects = [] as MountedPaginatedSurfaceViewportState["pageRects"];
  let destroyed = false;
  let preparation: readonly number[] | undefined;
  let previousTop = coordinator.getVisibleRegion().y;
  let direction = 1;

  /** Throws when a backend tries to use an already released page authority. */
  const assertActive = (): void => {
    if (destroyed) {
      throw new RangeError("Cannot use a destroyed paginated-surface lifecycle");
    }
  };

  /**
   * Resolves canonical page geometry, narrowing clips and mounting together
   * while a synchronous viewport preparation owns the render scope.
   *
   * @param rects - Page rectangles in document order.
   * @param bufferPages - Optional buffer override.
   * @returns Ascending mounted page indices.
   */
  const resolveVisible = (
    rects: MountedPaginatedSurfaceViewportState["pageRects"],
    bufferPages = options.readBufferPages()
  ): readonly number[] => {
    const buffered = resolveMountedVisiblePageIndices({ coordinator, pageRects: rects, bufferPages });
    return preparation === undefined ? buffered : resolvePagePreparationWindow(
      resolveMountedVisiblePageIndices({ coordinator, pageRects: rects, bufferPages: 0 }),
      buffered, preparation
    );
  };

  /**
   * Synchronizes the sparse page stack for one known visible set.
   *
   * @param visiblePageIndices - Buffered visible page indices.
   * @returns Mounted frames and the subset requiring backend realization.
   */
  const synchronize = (
    visiblePageIndices: readonly number[]
  ): MountedPaginatedSurfaceRealization<Surface> => {
    const { frames, mountedThisSync } = manager.sync({
      pages,
      visiblePageIndices,
      geometryEpoch: options.readGeometryEpoch()
    });
    placeholders.retain(frames, mountedThisSync);

    return {
      frames,
      realizedFrames: mountedThisSync,
      visiblePageIndices
    };
  };

  /**
   * Applies one viewport transition without rebuilding document state unless
   * retained clip coverage explicitly requires it.
   *
   * @param visiblePageIndices - Exact window shared by clip construction and mounting.
   */
  const handleViewportTransition = (
    visiblePageIndices: readonly number[]
  ): void => {
    if (destroyed || pages.length === 0) {
      return;
    }

    const viewportState: MountedPaginatedSurfaceViewportState = {
      pages,
      pageRects,
      visiblePageIndices
    };

    // Clip refresh and sparse realization are mutually exclusive authorities:
    // a refresh replaces the page snapshot, while realization only mounts the
    // already-retained snapshot into newly visible backend surfaces.
    if (options.shouldRequestDocumentRefresh(viewportState)) {
      preparation = visiblePageIndices;
      try {
        options.requestDocumentRefresh();
      } finally {
        preparation = undefined;
      }
      return;
    }

    const realization = synchronize(visiblePageIndices);
    options.realizeViewport(realization);
    options.onVisiblePagesChange?.(visiblePageIndices);
  };

  const viewportTask = new PageStackViewportTask(options.ownerDocument.defaultView, (prefetch) => {
    if (destroyed || pages.length === 0) return false;
    if (prefetch === undefined) {
      handleViewportTransition(resolveVisible(pageRects));
      return false;
    }
    const top = coordinator.getVisibleRegion().y;
    direction = Math.sign(top - previousTop) || direction;
    previousTop = top;
    const buffered = resolveVisible(pageRects);
    const next = resolvePagePreparationWindow(
      resolveVisible(pageRects, 0), buffered,
      manager.getFrames().map(frame => frame.pageIndex), direction, prefetch
    );
    handleViewportTransition(next);
    return !destroyed && next.length < buffered.length;
  });
  const unsubscribe = coordinator.subscribe(() => viewportTask.request());

  return {
    getVisibleRegion() {
      assertActive();
      return coordinator.getVisibleRegion();
    },
    coversViewport(rects, bufferPages) {
      assertActive();
      return !options.shouldRequestDocumentRefresh({
        pages, pageRects: rects, visiblePageIndices: resolveVisible(rects, bufferPages)
      });
    },
    scrollByDocument(deltaY) {
      assertActive();
      if (options.scrollSource.scrollByDocument === undefined) return false;
      options.scrollSource.scrollByDocument(deltaY);
      return true;
    },
    resolveVisiblePageIndices(rects, bufferPages) {
      assertActive();
      return resolveVisible(rects, bufferPages);
    },
    syncViewport(bufferPages?: number): void {
      assertActive();
      viewportTask.cancel();
      handleViewportTransition(resolveVisible(pageRects, bufferPages));
    },
    replacePages(
      replaceOptions: ReplaceMountedPaginatedSurfacePagesOptions
    ): MountedPaginatedSurfaceRealization<Surface> {
      assertActive();
      viewportTask.cancel();
      pages = replaceOptions.pages;
      pageRects = pages.map((page) => page.pageRect);
      placeholders.replacePages(pages);
      const visiblePageIndices = resolveVisible(
        pageRects,
        replaceOptions.bufferPages
      );
      const realization = synchronize(visiblePageIndices);
      options.onVisiblePagesChange?.(visiblePageIndices);
      return realization;
    },
    getPages() {
      assertActive();
      return pages;
    },
    getPageRects() {
      assertActive();
      return pageRects;
    },
    getFrames() {
      assertActive();
      return manager.getFrames();
    },
    markPainted(frames) {
      assertActive();
      for (const { surface } of frames) options.adapter.markPainted?.(surface);
      placeholders.markPainted(frames);
    },
    destroy(): void {
      if (destroyed) {
        return;
      }

      destroyed = true;
      unsubscribe();
      viewportTask.cancel();
      manager.destroy();
      placeholders.destroy();
      coordinator.destroy();
      pages = [];
      pageRects = [];
    }
  };
}
