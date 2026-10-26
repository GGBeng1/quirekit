import { describe, expect, it } from "vitest";
import type { QuireLayoutPage } from "@quirekit/view-engine";
import {
  createQuirePageStackDisplayListsForRects,
  createQuirePageStackManager
} from "../../shared";
import type {
  QuirePageStackDisplayListChunk,
  QuirePageStackDisplayListChunkRecord
} from "../../shared/page-stack/types";
import type { QuireViewRenderResult } from "../../types";
import { FakeCanvasMountDocument } from "../../../../test-support/mount/canvas";
import type { FakeCanvasMountContext } from "../../../../test-support/mount/canvas/context";
import { canvasPageFrame, createCanvasPageSurfaceAdapter } from "./adapter";
import type { CanvasPageStackFrame } from "./frames";
import {
  createCanvasPageStackContentPaintCache,
  createCanvasPageStackOverlayPaintCache,
  repaintCanvasPageStackContents,
  renderCanvasPageStack,
  repaintCanvasPageStackOverlays
} from "./render";

/**
 * Mounts page frames for every supplied page through the frame manager.
 *
 * @param ownerDocument - Fake owner document.
 * @param host - Page-stack host element.
 * @param pages - Pages to mount.
 * @param devicePixelRatio - Device pixel ratio for the backing stores.
 * @returns Mounted frame descriptors.
 */
function mountFrames(
  ownerDocument: FakeCanvasMountDocument,
  host: ReturnType<FakeCanvasMountDocument["createElement"]>,
  pages: readonly QuireLayoutPage[],
  devicePixelRatio: number
): readonly CanvasPageStackFrame[] {
  const manager = createQuirePageStackManager({
    host: host as unknown as HTMLElement,
    ownerDocument: ownerDocument as unknown as Document,
    adapter: createCanvasPageSurfaceAdapter(() => devicePixelRatio)
  });

  return manager.sync({
    pages,
    visiblePageIndices: pages.map((_, index) => index),
    geometryEpoch: devicePixelRatio
  }).frames.map(canvasPageFrame);
}

/**
 * Builds a layout page at a page rectangle.
 *
 * @param pageIndex - Zero-based page index.
 * @param y - Page top in document space.
 * @returns Layout page fragment 100x60 at the given top.
 */
function page(pageIndex: number, y: number): QuireLayoutPage {
  return {
    pageIndex,
    range: { from: pageIndex, to: pageIndex + 1 },
    pageRect: { x: 0, y, width: 100, height: 60 },
    bodyRect: { x: 10, y: y + 10, width: 80, height: 40 }
  };
}

/**
 * Creates the retained page-local record for a test page chunk.
 *
 * @param pageIndex - Page index owned by the retained record.
 * @param pageRect - Page rectangle in document space.
 * @returns Retained page-local display chunk record.
 */
function retainedPageRecord(
  pageIndex: number,
  pageRect: QuireLayoutPage["pageRect"]
): QuirePageStackDisplayListChunkRecord {
  return {
    key: `page:${pageIndex}`,
    kind: "page-local",
    rect: pageRect,
    pageIndex,
    pageRect
  };
}

/** Empty document-space render result (no commands, only clears). */
const emptyRenderResult = {
  contentDisplayList: { bounds: { x: 0, y: 0, width: 0, height: 0 }, commands: [] },
  overlayDisplayList: { bounds: { x: 0, y: 0, width: 0, height: 0 }, commands: [] }
} as unknown as QuireViewRenderResult;

/**
 * Adds retained page-local chunks to a render-result fixture.
 *
 * @param renderResult - Fixture render result with content and overlay lists.
 * @param frames - Page-stack frames that should receive chunks.
 * @returns Render result carrying page-local content and overlay chunks.
 */
function withPageChunks(
  renderResult: QuireViewRenderResult,
  frames: readonly CanvasPageStackFrame[]
): QuireViewRenderResult {
  const pageRects = frames.map((frame) => frame.pageRect);
  const contentDisplayLists = createQuirePageStackDisplayListsForRects(
    renderResult.contentDisplayList,
    pageRects
  );
  const overlayDisplayLists = createQuirePageStackDisplayListsForRects(
    renderResult.overlayDisplayList,
    pageRects
  );
  const chunks: QuirePageStackDisplayListChunk[] = frames.map((frame, index) => ({
    retainedRecord: retainedPageRecord(frame.pageIndex, frame.pageRect),
    sourceOwnerKeys: [`layout-node:page-${frame.pageIndex}`],
    pageIndex: frame.pageIndex,
    pageRect: frame.pageRect,
    contentDirtyBounds: frame.pageRect,
    overlayDirtyBounds: frame.pageRect,
    contentDisplayList: contentDisplayLists[index]!,
    overlayDisplayList: overlayDisplayLists[index]!
  }));

  return {
    ...renderResult,
    pageDisplayListChunks: {
      chunks,
      chunksByPageIndex: Object.fromEntries(chunks.map((chunk) => [
        chunk.pageIndex,
        chunk
      ]))
    }
  };
}

/**
 * Reads the fake context for a frame canvas.
 *
 * @param canvas - Frame canvas to inspect.
 * @returns Fake rendering context.
 */
function context(canvas: HTMLCanvasElement): FakeCanvasMountContext {
  return canvas.getContext("2d") as unknown as FakeCanvasMountContext;
}

describe("renderCanvasPageStack", () => {
  it("paints each page through its own DPR + page-local transform", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0), page(1, 70)], 2);

    renderCanvasPageStack({
      frames,
      renderResult: withPageChunks(emptyRenderResult, frames),
      devicePixelRatio: 2
    });

    // Page 0 sits at the origin; page 1 is translated up by its document top * DPR.
    expect(context(frames[0]!.content).transforms).toContain("setTransform(2,0,0,2,0,0)");
    expect(context(frames[1]!.content).transforms).toContain("setTransform(2,0,0,2,0,-140)");
    // Each page clears only its own bounds, so painting happened per page.
    expect(context(frames[1]!.content).calls.some((call) => call.startsWith("clearRect"))).toBe(true);
  });

  it("paints only commands that intersect each page frame", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0), page(1, 70)], 1);
    const renderResult = {
      contentDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 130 },
        commands: [
          {
            id: "page-0-text",
            kind: "text",
            rect: { x: 10, y: 10, width: 30, height: 12 },
            text: "first",
            origin: { x: 10, y: 20 },
            font: "16px sans-serif",
            fillStyle: "#111"
          },
          {
            id: "page-1-text",
            kind: "text",
            rect: { x: 10, y: 80, width: 30, height: 12 },
            text: "second",
            origin: { x: 10, y: 90 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      },
      overlayDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 130 }, commands: [] }
    } as unknown as QuireViewRenderResult;

    renderCanvasPageStack({
      frames,
      renderResult: withPageChunks(renderResult, frames),
      devicePixelRatio: 1
    });

    expect(context(frames[0]!.content).calls).toContain("fillText(first,10,20)");
    expect(context(frames[0]!.content).calls).not.toContain("fillText(second,10,90)");
    expect(context(frames[1]!.content).calls).toContain("fillText(second,10,90)");
    expect(context(frames[1]!.content).calls).not.toContain("fillText(first,10,20)");
  });

  it("paints retained page-local render-result chunks", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const pages = [page(0, 0), page(1, 70)];
    const frames = mountFrames(ownerDocument, host, pages, 1);
    const firstChunk = {
      retainedRecord: retainedPageRecord(0, pages[0]!.pageRect),
      pageIndex: 0,
      pageRect: pages[0]!.pageRect,
      contentDirtyBounds: pages[0]!.pageRect,
      overlayDirtyBounds: null,
      contentDisplayList: {
        bounds: pages[0]!.pageRect,
        commands: [
          {
            id: "page-0-text",
            kind: "text",
            rect: { x: 10, y: 10, width: 30, height: 12 },
            text: "first",
            origin: { x: 10, y: 20 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      },
      overlayDisplayList: { bounds: pages[0]!.pageRect, commands: [] }
    };
    const secondChunk = {
      retainedRecord: retainedPageRecord(1, pages[1]!.pageRect),
      pageIndex: 1,
      pageRect: pages[1]!.pageRect,
      contentDirtyBounds: pages[1]!.pageRect,
      overlayDirtyBounds: null,
      contentDisplayList: {
        bounds: pages[1]!.pageRect,
        commands: [
          {
            id: "page-1-text",
            kind: "text",
            rect: { x: 10, y: 80, width: 30, height: 12 },
            text: "second",
            origin: { x: 10, y: 90 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      },
      overlayDisplayList: { bounds: pages[1]!.pageRect, commands: [] }
    };
    const renderResult = {
      contentDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 130 }, commands: [] },
      overlayDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 130 }, commands: [] },
      pageDisplayListChunks: {
        chunks: [firstChunk, secondChunk],
        chunksByPageIndex: {
          0: firstChunk,
          1: secondChunk
        }
      }
    } as unknown as QuireViewRenderResult;

    renderCanvasPageStack({ frames, renderResult, devicePixelRatio: 1 });

    expect(context(frames[0]!.content).calls).toContain("fillText(first,10,20)");
    expect(context(frames[1]!.content).calls).toContain("fillText(second,10,90)");
  });

  it("skips unchanged content repaints while keeping overlays live", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0)], 1);
    const paintCache = createCanvasPageStackContentPaintCache();
    const renderResult = withPageChunks({
      contentDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: [
          {
            id: "page-0-text",
            kind: "text",
            rect: { x: 10, y: 10, width: 30, height: 12 },
            text: "stable",
            origin: { x: 10, y: 20 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      },
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: [
          {
            id: "caret",
            kind: "caret",
            rect: { x: 20, y: 10, width: 1, height: 12 },
            fillStyle: "#111"
          }
        ]
      }
    } as unknown as QuireViewRenderResult, frames);

    renderCanvasPageStack({
      frames,
      renderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    const contentCallsAfterFirstPaint = context(frames[0]!.content).calls.length;
    const overlayCallsAfterFirstPaint = context(frames[0]!.overlay).calls.length;

    renderCanvasPageStack({
      frames,
      renderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });

    expect(context(frames[0]!.content).calls).toHaveLength(contentCallsAfterFirstPaint);
    expect(context(frames[0]!.overlay).calls.length).toBeGreaterThan(overlayCallsAfterFirstPaint);
    expect(paintCache.snapshot()).toMatchObject({
      liveSurfaceSkips: 1,
      bitmapRestores: 0,
      displayListPaints: 1,
      bitmapStores: 0
    });
  });

  it("skips unchanged page overlay repaints when the overlay cache hits", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0)], 1);
    const overlayCache = createCanvasPageStackOverlayPaintCache();
    const renderResult = withPageChunks({
      contentDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 60 }, commands: [] },
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: [
          {
            id: "selection",
            kind: "fill-rect",
            rect: { x: 10, y: 10, width: 30, height: 12 },
            fillStyle: "rgba(59,130,246,0.25)"
          }
        ]
      }
    } as unknown as QuireViewRenderResult, frames);

    renderCanvasPageStack({
      frames,
      renderResult,
      devicePixelRatio: 1,
      overlayPaintCache: overlayCache
    });
    const overlayCallsAfterFirstPaint = context(frames[0]!.overlay).calls.length;

    renderCanvasPageStack({
      frames,
      renderResult,
      devicePixelRatio: 1,
      overlayPaintCache: overlayCache
    });

    expect(context(frames[0]!.overlay).calls).toHaveLength(overlayCallsAfterFirstPaint);
    expect(overlayCache.snapshot()).toMatchObject({ hits: 1, misses: 1, stores: 1 });
  });

  it("ignores non-paint command metadata when reusing cached page content", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0)], 1);
    const paintCache = createCanvasPageStackContentPaintCache();
    const firstRenderResult = withPageChunks({
      contentDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: [
          {
            id: "page-0-text-before",
            kind: "text",
            range: { from: 1, to: 7 },
            layer: "content",
            rect: { x: 10, y: 10, width: 30, height: 12 },
            text: "stable",
            origin: { x: 10, y: 20 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      },
      overlayDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 60 }, commands: [] }
    } as unknown as QuireViewRenderResult, frames);
    const secondRenderResult = withPageChunks({
      ...firstRenderResult,
      contentDisplayList: {
        ...firstRenderResult.contentDisplayList,
        commands: [
          {
            id: "page-0-text-after",
            kind: "text",
            range: { from: 2, to: 8 },
            rect: { x: 10, y: 10, width: 30, height: 12 },
            text: "stable",
            origin: { x: 10, y: 20 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      }
    } as unknown as QuireViewRenderResult, frames);

    renderCanvasPageStack({
      frames,
      renderResult: firstRenderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    const contentCallsAfterFirstPaint = context(frames[0]!.content).calls.length;
    renderCanvasPageStack({
      frames,
      renderResult: secondRenderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });

    expect(context(frames[0]!.content).calls).toHaveLength(contentCallsAfterFirstPaint);
    expect(paintCache.snapshot()).toMatchObject({
      liveSurfaceSkips: 1,
      bitmapRestores: 0,
      displayListPaints: 1,
      bitmapStores: 0
    });
  });

  it("retires only the latest exact content version after speculative command updates", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const restoredHost = ownerDocument.createElement("div");
    const staleHost = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0)], 1);
    const restoredFrames = mountFrames(ownerDocument, restoredHost, [page(0, 0)], 1);
    const staleFrames = mountFrames(ownerDocument, staleHost, [page(0, 0)], 1);
    const paintCache = createCanvasPageStackContentPaintCache();
    const firstRenderResult = withPageChunks({
      contentDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: [
          {
            id: "page-0-text",
            kind: "text",
            rect: { x: 10, y: 10, width: 30, height: 12 },
            text: "preedit-a",
            origin: { x: 10, y: 20 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      },
      overlayDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 60 }, commands: [] }
    } as unknown as QuireViewRenderResult, frames);
    const secondRenderResult = withPageChunks({
      ...firstRenderResult,
      contentDisplayList: {
        ...firstRenderResult.contentDisplayList,
        commands: [
          {
            id: "page-0-text",
            kind: "text",
            rect: { x: 10, y: 10, width: 30, height: 12 },
            text: "preedit-ab",
            origin: { x: 10, y: 20 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      }
    } as unknown as QuireViewRenderResult, frames);

    renderCanvasPageStack({
      frames,
      renderResult: firstRenderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    renderCanvasPageStack({
      frames,
      renderResult: secondRenderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });

    expect(context(frames[0]!.content).calls).toContain("fillText(preedit-a,10,20)");
    expect(context(frames[0]!.content).calls).toContain("fillText(preedit-ab,10,20)");
    expect(paintCache.snapshot()).toMatchObject({
      liveSurfaceSkips: 0,
      bitmapRestores: 0,
      displayListPaints: 2,
      bitmapStores: 0,
      bitmapReplacements: 0
    });
    expect(paintCache.retireSurface(frames[0]!.content)).toBe(true);
    expect(paintCache.snapshot()).toMatchObject({
      bitmapStores: 1,
      retainedBitmapEntries: 1
    });

    renderCanvasPageStack({
      frames: restoredFrames,
      renderResult: secondRenderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    expect(context(restoredFrames[0]!.content).calls).toContain("drawImage(0,0)");
    expect(context(restoredFrames[0]!.content).calls).not.toContain(
      "fillText(preedit-ab,10,20)"
    );

    renderCanvasPageStack({
      frames: staleFrames,
      renderResult: firstRenderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    expect(context(staleFrames[0]!.content).calls).not.toContain("drawImage(0,0)");
    expect(context(staleFrames[0]!.content).calls).toContain("fillText(preedit-a,10,20)");
  });

  it("restores unchanged page content when the page remounts on another surface", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const firstHost = ownerDocument.createElement("div");
    const secondHost = ownerDocument.createElement("div");
    const firstFrames = mountFrames(ownerDocument, firstHost, [page(0, 0)], 1);
    const secondFrames = mountFrames(ownerDocument, secondHost, [page(0, 0)], 1);
    const paintCache = createCanvasPageStackContentPaintCache({
      maxBitmapBytes: 100 * 60 * 4
    });
    const renderResult = withPageChunks({
      contentDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: [
          {
            id: "page-0-text",
            kind: "text",
            rect: { x: 10, y: 10, width: 30, height: 12 },
            text: "retained",
            origin: { x: 10, y: 20 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      },
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: []
      }
    } as unknown as QuireViewRenderResult, firstFrames);

    renderCanvasPageStack({
      frames: firstFrames,
      renderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    expect(paintCache.snapshot()).toMatchObject({
      bitmapStores: 0,
      retainedBitmapEntries: 0
    });
    expect(paintCache.retireSurface(firstFrames[0]!.content)).toBe(true);
    const overlayChangedRenderResult = withPageChunks({
      ...renderResult,
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: [
          {
            id: "selection-after-remount",
            kind: "fill-rect",
            rect: { x: 12, y: 10, width: 20, height: 12 },
            fillStyle: "rgba(59,130,246,0.25)"
          }
        ]
      }
    } as unknown as QuireViewRenderResult, secondFrames);
    renderCanvasPageStack({
      frames: secondFrames,
      renderResult: overlayChangedRenderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });

    expect(context(secondFrames[0]!.content).calls).toContain("drawImage(0,0)");
    expect(context(secondFrames[0]!.content).calls).not.toContain(
      "fillText(retained,10,20)"
    );
    expect(context(secondFrames[0]!.overlay).calls).toContain(
      "fillRect(12,10,20,12)"
    );
    expect(paintCache.snapshot()).toMatchObject({
      liveSurfaceSkips: 0,
      bitmapRestores: 1,
      displayListPaints: 1,
      bitmapStores: 1,
      retainedBitmapEntries: 1,
      retainedBitmapBytes: 100 * 60 * 4
    });
  });

  it("evicts least-recently-used page bitmaps within the explicit byte budget", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const paintCache = createCanvasPageStackContentPaintCache({
      maxBitmapBytes: 2 * 100 * 60 * 4
    });
    /**
     * Mounts and paints one isolated page against the shared bitmap cache.
     *
     * @param pageIndex - Page identity to render.
     * @returns Mounted page frame after synchronization.
     */
    const renderPage = (pageIndex: number): CanvasPageStackFrame => {
      const host = ownerDocument.createElement("div");
      const allFrames = mountFrames(
        ownerDocument,
        host,
        Array.from(
          { length: pageIndex + 1 },
          (_, index) => page(index, index * 70)
        ),
        1
      );
      const frame = allFrames[pageIndex]!;
      const frames = [frame];
      const renderResult = withPageChunks({
        contentDisplayList: {
          bounds: { x: 0, y: 0, width: 100, height: pageIndex * 70 + 60 },
          commands: [
            {
              id: `page-${pageIndex}-text`,
              kind: "text",
              rect: { x: 10, y: pageIndex * 70 + 10, width: 30, height: 12 },
              text: `page-${pageIndex}`,
              origin: { x: 10, y: pageIndex * 70 + 20 },
              font: "16px sans-serif",
              fillStyle: "#111"
            }
          ]
        },
        overlayDisplayList: {
          bounds: { x: 0, y: 0, width: 100, height: pageIndex * 70 + 60 },
          commands: []
        }
      } as unknown as QuireViewRenderResult, frames);
      renderCanvasPageStack({
        frames,
        renderResult,
        devicePixelRatio: 1,
        contentPaintCache: paintCache
      });
      paintCache.retireSurface(frame.content);
      return frame;
    };

    renderPage(0);
    renderPage(1);
    renderPage(0);
    renderPage(2);
    const remountedPageOne = renderPage(1);

    expect(context(remountedPageOne.content).calls).toContain(
      "fillText(page-1,10,90)"
    );
    expect(paintCache.snapshot()).toMatchObject({
      bitmapRestores: 1,
      displayListPaints: 4,
      bitmapEvictions: 2,
      retainedBitmapEntries: 2,
      retainedBitmapBytes: 2 * 100 * 60 * 4
    });

    paintCache.destroy();
    expect(paintCache.snapshot()).toMatchObject({
      retainedBitmapEntries: 0,
      retainedBitmapBytes: 0
    });
  });

  it("drops transient preview pixels instead of retiring them as accepted content", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0)], 1);
    const frame = frames[0]!;
    const paintCache = createCanvasPageStackContentPaintCache();
    const renderResult = withPageChunks(emptyRenderResult, frames);

    renderCanvasPageStack({
      frames,
      renderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    paintCache.invalidateSurface(frame.content);
    repaintCanvasPageStackContents({
      frames,
      renderResult,
      devicePixelRatio: 1
    });

    expect(paintCache.retireSurface(frame.content)).toBe(false);
    expect(paintCache.snapshot()).toMatchObject({
      liveSurfaceSkips: 0,
      displayListPaints: 1,
      bitmapStores: 0,
      retainedBitmapEntries: 0
    });

    renderCanvasPageStack({
      frames,
      renderResult,
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    expect(paintCache.snapshot()).toMatchObject({
      liveSurfaceSkips: 0,
      displayListPaints: 2,
      bitmapStores: 0
    });
    expect(paintCache.retireSurface(frame.content)).toBe(true);
    expect(paintCache.snapshot()).toMatchObject({ bitmapStores: 1 });
  });

  it("rejects retirement after the backing-store epoch changes", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0)], 1);
    const frame = frames[0]!;
    const paintCache = createCanvasPageStackContentPaintCache();

    renderCanvasPageStack({
      frames,
      renderResult: withPageChunks(emptyRenderResult, frames),
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    frame.content.dataset.qkContentPaintEpoch = "stale";

    expect(paintCache.retireSurface(frame.content)).toBe(false);
    expect(paintCache.snapshot()).toMatchObject({
      bitmapStores: 0,
      retainedBitmapEntries: 0
    });
  });

  it("does not capture surfaces retired during cache teardown", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0)], 1);
    const frame = frames[0]!;
    const paintCache = createCanvasPageStackContentPaintCache();

    renderCanvasPageStack({
      frames,
      renderResult: withPageChunks(emptyRenderResult, frames),
      devicePixelRatio: 1,
      contentPaintCache: paintCache
    });
    paintCache.destroy();

    expect(paintCache.retireSurface(frame.content)).toBe(false);
    expect(paintCache.snapshot()).toMatchObject({
      bitmapStores: 0,
      retainedBitmapEntries: 0
    });
  });

  it("repaints each page overlay for the caret blink with the page-local transform", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0), page(1, 70)], 2);

    const overlayRenderResult = withPageChunks({
      contentDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 130 }, commands: [] },
      overlayDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 130 }, commands: [
        { id: "mark", kind: "fill-rect", rect: { x: 20, y: 80, width: 4, height: 4 }, fillStyle: "#111" }
      ] }
    } as unknown as QuireViewRenderResult, frames);

    repaintCanvasPageStackOverlays({
      frames,
      pageDisplayListChunks: overlayRenderResult.pageDisplayListChunks!,
      devicePixelRatio: 2,
      caretVisible: false
    });

    // The blink repaints overlays (not content) per page, each through its transform.
    expect(context(frames[1]!.overlay).transforms).toContain("setTransform(2,0,0,2,0,-140)");
    expect(context(frames[1]!.overlay).calls.some((call) => call.startsWith("clearRect"))).toBe(true);
    expect(context(frames[0]!.content).calls).toHaveLength(0);
    // A page without overlay ink keeps only an empty one-pixel store.
    expect([frames[0]!.overlay.width, frames[0]!.overlay.height]).toEqual([1, 1]);
  });

  it("repaints transient page content without touching overlay surfaces", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0)], 2);
    const renderResult = withPageChunks({
      contentDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: [{
          id: "moved-object",
          kind: "fill-rect",
          rect: { x: 20, y: 10, width: 30, height: 20 },
          fillStyle: "#123"
        }]
      },
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 100, height: 60 },
        commands: []
      }
    } as unknown as QuireViewRenderResult, frames);

    repaintCanvasPageStackContents({
      frames,
      renderResult,
      devicePixelRatio: 2
    });

    expect(context(frames[0]!.content).transforms).toContain(
      "setTransform(2,0,0,2,0,0)"
    );
    expect(context(frames[0]!.content).calls).toContain(
      "fillRect(20,10,30,20)"
    );
    expect(context(frames[0]!.overlay).calls).toHaveLength(0);
  });

  it("repaints only the caret page when blink filtering changes overlay paint", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const frames = mountFrames(ownerDocument, host, [page(0, 0), page(1, 70)], 1);
    const overlayCache = createCanvasPageStackOverlayPaintCache();
    const overlayDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 130 },
      commands: [
        {
          id: "caret",
          kind: "caret",
          rect: { x: 20, y: 10, width: 1, height: 12 },
          fillStyle: "#111"
        }
      ]
    } as const;
    const overlayRenderResult = withPageChunks({
      contentDisplayList: { bounds: { x: 0, y: 0, width: 100, height: 130 }, commands: [] },
      overlayDisplayList
    } as unknown as QuireViewRenderResult, frames);

    repaintCanvasPageStackOverlays({
      frames,
      pageDisplayListChunks: overlayRenderResult.pageDisplayListChunks!,
      devicePixelRatio: 1,
      caretVisible: true,
      overlayPaintCache: overlayCache
    });
    const firstPageOverlayCallsAfterVisible = context(frames[0]!.overlay).calls.length;
    const secondPageOverlayCallsAfterVisible = context(frames[1]!.overlay).calls.length;

    repaintCanvasPageStackOverlays({
      frames,
      pageDisplayListChunks: overlayRenderResult.pageDisplayListChunks!,
      devicePixelRatio: 1,
      caretVisible: false,
      overlayPaintCache: overlayCache
    });

    expect(context(frames[0]!.overlay).calls.length).toBeGreaterThan(
      firstPageOverlayCallsAfterVisible
    );
    expect(context(frames[1]!.overlay).calls).toHaveLength(
      secondPageOverlayCallsAfterVisible
    );
    expect(overlayCache.snapshot()).toMatchObject({ hits: 1, misses: 3, stores: 3 });
  });
});
