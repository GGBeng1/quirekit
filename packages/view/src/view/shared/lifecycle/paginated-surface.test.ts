// @vitest-environment happy-dom

import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutPage } from "@quirekit/view-engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuirePageSurfaceAdapter } from "../page-stack";
import type { ScrollSource } from "../viewport";
import { createMountedPaginatedSurfaceLifecycle } from "./paginated-surface";

/** Fake backend surface used to observe sparse page realization. */
interface FakeSurface {
  /** Wrapper attached to the fake page-stack host. */
  readonly wrapper: HTMLElement;
}

/** Controllable scroll source and its test observations. */
interface FakeScrollSourceSetup {
  /** Scroll source consumed by the lifecycle. */
  readonly scrollSource: ScrollSource;
  /** Replaces the visible document region and notifies subscribers. */
  readonly moveTo: (region: QuireRect) => void;
  /** Reads how many subscribers remain attached. */
  readonly getSubscriberCount: () => number;
  /** Reads how many times the source was destroyed. */
  readonly getDestroyCount: () => number;
}

/**
 * Creates one stacked layout page.
 *
 * @param pageIndex - Zero-based page index.
 * @returns Layout page with a 100-pixel document-space extent.
 */
function page(pageIndex: number): QuireLayoutPage {
  return {
    pageIndex,
    range: { from: pageIndex, to: pageIndex },
    pageRect: { x: 0, y: pageIndex * 100, width: 80, height: 100 },
    bodyRect: { x: 0, y: pageIndex * 100, width: 80, height: 100 }
  } as QuireLayoutPage;
}

/**
 * Creates a controllable backend-neutral scroll source.
 *
 * @param initialRegion - Initial visible region in document space.
 * @returns Scroll source and test-only controls.
 */
function createFakeScrollSource(initialRegion: QuireRect): FakeScrollSourceSetup {
  const listeners = new Set<() => void>();
  let region = initialRegion;
  let destroyCount = 0;

  return {
    scrollSource: {
      getVisibleRegion() {
        return region;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      destroy() {
        destroyCount += 1;
        listeners.clear();
      }
    },
    moveTo(nextRegion) {
      region = nextRegion;
      for (const listener of [...listeners]) {
        listener();
      }
    },
    getSubscriberCount() {
      return listeners.size;
    },
    getDestroyCount() {
      return destroyCount;
    }
  };
}

/**
 * Creates a DOM-backed fake page surface adapter.
 *
 * @returns Fake adapter used by lifecycle tests.
 */
function createFakeAdapter(): QuirePageSurfaceAdapter<FakeSurface> {
  return {
    createSurface(ownerDocument) {
      return { wrapper: ownerDocument.createElement("div") };
    },
    applyGeometry(surface, pageIndex) {
      surface.wrapper.dataset.pageIndex = String(pageIndex);
    },
    attach(surface, host) {
      host.appendChild(surface.wrapper);
    },
    detach(surface) {
      surface.wrapper.remove();
    }
  };
}

describe("createMountedPaginatedSurfaceLifecycle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("prepares visible pages first, warms one neighbour per idle turn and cancels obsolete directions", () => {
    const idle = new Map<number, IdleRequestCallback>();
    let idleId = 0;
    vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => {
      idle.set(++idleId, callback);
      return idleId;
    });
    vi.stubGlobal("cancelIdleCallback", (id: number) => idle.delete(id));
    const source = createFakeScrollSource({ x: 0, y: 0, width: 80, height: 80 });
    const pages = Array.from({ length: 10 }, (_, i) => page(i));
    const rects = pages.map(p => p.pageRect);
    const batches: number[][] = [];
    let coverage = new Set([0, 1]);
    const lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: source.scrollSource, host: document.createElement("div"), ownerDocument: document,
      adapter: createFakeAdapter(), readBufferPages: () => 1, readGeometryEpoch: () => 0,
      shouldRequestDocumentRefresh: ({ visiblePageIndices }) => visiblePageIndices.some(i => !coverage.has(i)),
      requestDocumentRefresh: () => {
        const indices = [...lifecycle.resolveVisiblePageIndices(rects, 1)];
        batches.push(indices);
        coverage = new Set(indices);
        lifecycle.replacePages({ pages, bufferPages: 1 });
      },
      realizeViewport: vi.fn()
    });
    /** Runs one browser idle opportunity without also running its successor. */
    const runIdle = (): void => {
      const [id, callback] = idle.entries().next().value!;
      idle.delete(id);
      callback({ didTimeout: false, timeRemaining: () => 20 });
    };
    try {
      lifecycle.replacePages({ pages });
      source.moveTo({ x: 0, y: 500, width: 80, height: 80 });
      vi.runAllTimers();
      expect(batches).toEqual([[5]]);
      expect(lifecycle.getFrames().map(f => f.pageIndex)).toEqual([5]);
      expect(idle.size).toBe(1);
      runIdle();
      expect(batches).toEqual([[5], [5, 6]]);
      vi.runAllTimers();
      runIdle();
      expect(batches).toEqual([[5], [5, 6], [4, 5, 6]]);
      vi.runAllTimers();
      expect(idle.size).toBe(0);

      source.moveTo({ x: 0, y: 200, width: 80, height: 80 });
      vi.runAllTimers();
      expect(batches.at(-1)).toEqual([2]);
      runIdle();
      expect(batches.at(-1)).toEqual([1, 2]);
      vi.runAllTimers();
      const obsolete = idle.values().next().value!;
      source.moveTo({ x: 0, y: 800, width: 80, height: 80 });
      expect(idle.size).toBe(0);
      obsolete({ didTimeout: false, timeRemaining: () => 20 });
      expect(batches.at(-1)).toEqual([1, 2]);
      vi.runAllTimers();
      expect(batches.at(-1)).toEqual([8]);
      lifecycle.destroy();
      expect(idle.size).toBe(0);
    } finally {
      lifecycle.destroy();
      vi.unstubAllGlobals();
    }
  });

  it("realizes only newly visible frames during a viewport transition", () => {
    const source = createFakeScrollSource({ x: 0, y: 0, width: 80, height: 80 });
    const realized: number[][] = [];
    const visible: number[][] = [];
    const lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: source.scrollSource,
      host: document.createElement("div"),
      ownerDocument: document,
      adapter: createFakeAdapter(),
      readBufferPages: () => 0,
      readGeometryEpoch: () => 0,
      shouldRequestDocumentRefresh: () => false,
      requestDocumentRefresh: vi.fn(),
      realizeViewport(realization) {
        realized.push(realization.realizedFrames.map((frame) => frame.pageIndex));
      },
      onVisiblePagesChange(pageIndices) {
        visible.push([...pageIndices]);
      }
    });

    const replacement = lifecycle.replacePages({
      pages: [page(0), page(1), page(2)]
    });
    expect(replacement.frames.map((frame) => frame.pageIndex)).toEqual([0]);
    expect(replacement.realizedFrames.map((frame) => frame.pageIndex)).toEqual([0]);

    source.moveTo({ x: 0, y: 100, width: 80, height: 80 });

    expect(realized).toEqual([]);
    vi.runAllTimers();

    expect(realized).toEqual([[1]]);
    expect(visible).toEqual([[0], [1]]);
    expect(lifecycle.getFrames().map((frame) => frame.pageIndex)).toEqual([1]);
  });

  it("requests a document refresh instead of realizing stale clip coverage", () => {
    const source = createFakeScrollSource({ x: 0, y: 0, width: 80, height: 80 });
    const requestDocumentRefresh = vi.fn();
    const realizeViewport = vi.fn();
    let requiresRefresh = false;
    const lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: source.scrollSource,
      host: document.createElement("div"),
      ownerDocument: document,
      adapter: createFakeAdapter(),
      readBufferPages: () => 0,
      readGeometryEpoch: () => 0,
      shouldRequestDocumentRefresh: () => requiresRefresh,
      requestDocumentRefresh,
      realizeViewport,
      onVisiblePagesChange: vi.fn()
    });

    lifecycle.replacePages({ pages: [page(0), page(1)] });
    requiresRefresh = true;
    source.moveTo({ x: 0, y: 100, width: 80, height: 80 });

    expect(requestDocumentRefresh).not.toHaveBeenCalled();
    vi.runAllTimers();

    expect(requestDocumentRefresh).toHaveBeenCalledTimes(1);
    expect(realizeViewport).not.toHaveBeenCalled();
    expect(lifecycle.getFrames().map((frame) => frame.pageIndex)).toEqual([0]);
  });

  it("supports explicit bridge synchronization and tears down every owner once", () => {
    const source = createFakeScrollSource({ x: 0, y: 0, width: 80, height: 80 });
    const host = document.createElement("div");
    const realizeViewport = vi.fn();
    const lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: source.scrollSource,
      host,
      ownerDocument: document,
      adapter: createFakeAdapter(),
      readBufferPages: () => 1,
      readGeometryEpoch: () => 0,
      shouldRequestDocumentRefresh: () => false,
      requestDocumentRefresh: vi.fn(),
      realizeViewport
    });

    lifecycle.replacePages({
      pages: [page(0), page(1), page(2)],
      bufferPages: 0
    });
    lifecycle.syncViewport(0);
    expect(realizeViewport).toHaveBeenCalledTimes(1);
    expect(lifecycle.getFrames().map((frame) => frame.pageIndex)).toEqual([0]);

    lifecycle.syncViewport();
    expect(realizeViewport).toHaveBeenCalledTimes(2);
    expect(lifecycle.getFrames().map((frame) => frame.pageIndex)).toEqual([0, 1]);
    expect(source.getSubscriberCount()).toBe(1);
    expect(host.querySelectorAll("[data-page-index]")).toHaveLength(2);
    expect(host.querySelectorAll("[data-qk-page-placeholder]")).toHaveLength(3);

    lifecycle.destroy();
    lifecycle.destroy();

    expect(source.getSubscriberCount()).toBe(0);
    expect(source.getDestroyCount()).toBe(1);
    expect(host.childElementCount).toBe(0);
    expect(() => lifecycle.getFrames()).toThrow(RangeError);
    expect(() => lifecycle.replacePages({ pages: [page(0)] })).toThrow(RangeError);
  });

  it("installs every known paper before scrolling and exposes loading until painted", () => {
    const source = createFakeScrollSource({ x: 0, y: 0, width: 80, height: 80 });
    const host = document.createElement("div");
    const lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: source.scrollSource, host, ownerDocument: document,
      adapter: createFakeAdapter(), readBufferPages: () => 0, readGeometryEpoch: () => 0,
      shouldRequestDocumentRefresh: () => false, requestDocumentRefresh: vi.fn(),
      realizeViewport: vi.fn()
    });
    const widePage = { ...page(2), pageRect: { x: 12, y: 240, width: 160, height: 90 } };
    const first = lifecycle.replacePages({ pages: [page(0), page(1), widePage] });
    const papers = host.querySelectorAll<HTMLElement>("[data-qk-page-placeholder]");
    expect(papers).toHaveLength(3);
    expect(papers[2]?.style.cssText).toContain("width: 160px");
    expect(papers[2]?.style.top).toBe("240px");
    expect(papers[2]?.style.left).toBe("12px");
    expect(papers[2]?.style.height).toBe("90px");
    expect(papers[2]?.dataset.qkPageReady).not.toBe("true");
    expect(lifecycle.getFrames()).toHaveLength(1);

    lifecycle.markPainted(first.frames);
    expect(papers[0]?.dataset.qkPageReady).toBe("true");
    expect(papers[0]?.style.visibility).not.toBe("hidden");
    source.moveTo({ x: 0, y: 240, width: 160, height: 80 });
    expect(papers[2]?.dataset.qkPageReady).not.toBe("true");
    expect(lifecycle.getFrames()[0]?.pageIndex).toBe(0);
    vi.runAllTimers();
    expect(lifecycle.getFrames()[0]?.pageIndex).toBe(2);
    expect(papers[0]?.dataset.qkPageReady).not.toBe("true");
    expect(papers[2]?.dataset.qkPageReady).not.toBe("true");
    lifecycle.markPainted(lifecycle.getFrames());
    expect(papers[2]?.dataset.qkPageReady).toBe("true");

    lifecycle.replacePages({ pages: [page(0), page(1), {
      ...widePage, pageRect: { ...widePage.pageRect, width: 180 }
    }] });
    expect(papers[2]?.style.width).toBe("180px");
    expect(papers[2]?.dataset.qkPageReady).toBe("false");

    lifecycle.replacePages({ pages: [page(0)] });
    expect(host.querySelectorAll("[data-qk-page-placeholder]")).toHaveLength(1);
    lifecycle.destroy();
    expect(host.childElementCount).toBe(0);
  });

  it("coalesces native scrolls after a paint opportunity and keeps only the latest viewport", () => {
    const source = createFakeScrollSource({ x: 0, y: 0, width: 80, height: 80 });
    const realizeViewport = vi.fn();
    const lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: source.scrollSource, host: document.createElement("div"), ownerDocument: document,
      adapter: createFakeAdapter(), readBufferPages: () => 0, readGeometryEpoch: () => 0,
      shouldRequestDocumentRefresh: () => false, requestDocumentRefresh: vi.fn(), realizeViewport
    });
    lifecycle.replacePages({ pages: [page(0), page(1), page(2)] });
    source.moveTo({ x: 0, y: 100, width: 80, height: 80 });
    source.moveTo({ x: 0, y: 200, width: 80, height: 80 });
    vi.advanceTimersToNextFrame();
    expect(realizeViewport).not.toHaveBeenCalled();
    vi.advanceTimersToNextFrame();
    expect(realizeViewport).not.toHaveBeenCalled();
    source.moveTo({ x: 0, y: 100, width: 80, height: 80 });
    vi.runAllTimers();
    expect(realizeViewport).toHaveBeenCalledTimes(1);
    expect(lifecycle.getFrames().map((frame) => frame.pageIndex)).toEqual([1]);
    lifecycle.destroy();
  });

  it("cancels pending native work on explicit synchronization, replacement and destruction", () => {
    const source = createFakeScrollSource({ x: 0, y: 0, width: 80, height: 80 });
    const realizeViewport = vi.fn();
    const lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: source.scrollSource, host: document.createElement("div"), ownerDocument: document,
      adapter: createFakeAdapter(), readBufferPages: () => 0, readGeometryEpoch: () => 0,
      shouldRequestDocumentRefresh: () => false, requestDocumentRefresh: vi.fn(), realizeViewport
    });
    const pages = [page(0), page(1)];
    lifecycle.replacePages({ pages });
    source.moveTo({ x: 0, y: 100, width: 80, height: 80 });
    lifecycle.syncViewport(0);
    expect(realizeViewport).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(realizeViewport).toHaveBeenCalledTimes(1);
    source.moveTo({ x: 0, y: 0, width: 80, height: 80 });
    vi.advanceTimersToNextFrame();
    lifecycle.replacePages({ pages });
    vi.runAllTimers();
    expect(realizeViewport).toHaveBeenCalledTimes(1);
    source.moveTo({ x: 0, y: 100, width: 80, height: 80 });
    lifecycle.destroy();
    vi.runAllTimers();
    expect(realizeViewport).toHaveBeenCalledTimes(1);
  });
});
