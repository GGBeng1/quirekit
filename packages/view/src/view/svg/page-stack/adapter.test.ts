// @vitest-environment happy-dom

import type { QuireDisplayList, QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  createQuirePageStackDisplayListsForRects,
  QuirePageSurfacePaintValidityCache
} from "../../shared";
import type {
  QuirePageStackDisplayListChunk,
  QuirePageStackDisplayListChunkRecord
} from "../../shared/page-stack/types";
import type { QuireViewRenderResult } from "../../types";
import {
  createSvgPageSurfaceAdapter,
  paintSvgPageFrameContent,
  paintSvgPageStackFrameContents,
  paintSvgPageStackFrameOverlays
} from "./adapter";
import { createSvgPageStackContentPaintCache } from "./content-paint-cache";

/**
 * Adds retained page-local chunks to an SVG render-result fixture.
 *
 * @param renderResult - Fixture render result with content and overlay lists.
 * @param pageRects - Page rectangles that should receive chunks.
 * @returns Render result carrying page-local content and overlay chunks.
 */
function withPageChunks(
  renderResult: Partial<QuireViewRenderResult> & {
    readonly contentDisplayList?: QuireDisplayList | undefined;
    readonly overlayDisplayList?: QuireDisplayList | undefined;
  },
  pageRects: readonly QuireRect[]
): QuireViewRenderResult {
  const contentDisplayList = renderResult.contentDisplayList
    ?? emptyDisplayList(pageRects);
  const overlayDisplayList = renderResult.overlayDisplayList
    ?? emptyDisplayList(pageRects);
  const contentDisplayLists = createQuirePageStackDisplayListsForRects(
    contentDisplayList,
    pageRects
  );
  const overlayDisplayLists = createQuirePageStackDisplayListsForRects(
    overlayDisplayList,
    pageRects
  );
  const chunks: QuirePageStackDisplayListChunk[] = pageRects.map((pageRect, pageIndex) => ({
    retainedRecord: retainedPageRecord(pageIndex, pageRect),
    sourceOwnerKeys: [`layout-node:page-${pageIndex}`],
    pageIndex,
    pageRect,
    contentDirtyBounds: pageRect,
    overlayDirtyBounds: pageRect,
    contentDisplayList: contentDisplayLists[pageIndex]!,
    overlayDisplayList: overlayDisplayLists[pageIndex]!
  }));

  return {
    ...renderResult,
    contentDisplayList,
    overlayDisplayList,
    pageDisplayListChunks: {
      chunks,
      chunksByPageIndex: Object.fromEntries(chunks.map((chunk) => [
        chunk.pageIndex,
        chunk
      ]))
    }
  } as unknown as QuireViewRenderResult;
}

/**
 * Creates a retained page-local record for an SVG page chunk fixture.
 *
 * @param pageIndex - Page index owned by the retained record.
 * @param pageRect - Page rectangle in document space.
 * @returns Retained page-local display chunk record.
 */
function retainedPageRecord(
  pageIndex: number,
  pageRect: QuireRect
): QuirePageStackDisplayListChunkRecord {
  return {
    key: `page:${pageIndex}`,
    kind: "page-local",
    rect: pageRect,
    pageIndex,
    pageRect
  };
}

/**
 * Creates an empty display list covering a set of page rectangles.
 *
 * @param pageRects - Page rectangles covered by the fixture.
 * @returns Empty display list with document-space bounds.
 */
function emptyDisplayList(pageRects: readonly QuireRect[]): QuireDisplayList {
  const first = pageRects[0] ?? { x: 0, y: 0, width: 0, height: 0 };
  const last = pageRects[pageRects.length - 1] ?? first;

  return {
    bounds: {
      x: first.x,
      y: first.y,
      width: Math.max(first.width, last.width),
      height: last.y + last.height - first.y
    },
    commands: []
  };
}

describe("createSvgPageSurfaceAdapter", () => {
  it("creates, attaches, geometries, and detaches an svg page frame", () => {
    const adapter = createSvgPageSurfaceAdapter();
    const host = document.createElement("div");
    const surface = adapter.createSurface(document);

    adapter.attach(surface, host);
    expect(host.childElementCount).toBe(1);

    adapter.applyGeometry(surface, 0, { x: 0, y: 0, width: 80, height: 100 });
    expect(surface.content.getAttribute("viewBox")).toBe("0 0 80 100");

    adapter.detach(surface);
    expect(host.childElementCount).toBe(0);
  });

  it("paints page content using the page rect as the SVG viewport", () => {
    const adapter = createSvgPageSurfaceAdapter();
    const surface = adapter.createSurface(document);
    const pageRect = { x: 0, y: 120, width: 80, height: 100 };

    adapter.applyGeometry(surface, 0, pageRect);
    paintSvgPageFrameContent(
      { pageIndex: 0, pageRect, surface },
      withPageChunks({
        contentDisplayList: {
          bounds: { x: 0, y: 0, width: 0, height: 0 },
          commands: [
            {
              id: "text",
              kind: "text",
              rect: { x: 8, y: 128, width: 32, height: 20 },
              text: "SVG",
              origin: { x: 8, y: 144 },
              font: "16px sans-serif",
              fillStyle: "#111827"
            }
          ]
        }
      }, [pageRect])
    );

    expect(surface.content.getAttribute("viewBox")).toBe("0 120 80 100");
    expect(surface.content.getAttribute("width")).toBe("80");
    expect(surface.content.getAttribute("height")).toBe("100");
    expect(surface.content.querySelector("text")?.textContent).toBe("SVG");
  });

  it("paints retained page-local render-result chunks", () => {
    const adapter = createSvgPageSurfaceAdapter();
    const firstSurface = adapter.createSurface(document);
    const secondSurface = adapter.createSurface(document);
    const firstPageRect = { x: 0, y: 0, width: 80, height: 100 };
    const secondPageRect = { x: 0, y: 120, width: 80, height: 100 };
    const frames = [
      { pageIndex: 0, pageRect: firstPageRect, surface: firstSurface },
      { pageIndex: 1, pageRect: secondPageRect, surface: secondSurface }
    ];
    const firstChunk = {
      retainedRecord: retainedPageRecord(0, firstPageRect),
      pageIndex: 0,
      pageRect: firstPageRect,
      contentDirtyBounds: firstPageRect,
      overlayDirtyBounds: null,
      contentDisplayList: {
        bounds: firstPageRect,
        commands: [
          {
            id: "first",
            kind: "text",
            rect: { x: 8, y: 8, width: 32, height: 20 },
            text: "first",
            origin: { x: 8, y: 24 },
            font: "16px sans-serif",
            fillStyle: "#111827"
          }
        ]
      },
      overlayDisplayList: { bounds: firstPageRect, commands: [] }
    };
    const secondChunk = {
      retainedRecord: retainedPageRecord(1, secondPageRect),
      pageIndex: 1,
      pageRect: secondPageRect,
      contentDirtyBounds: secondPageRect,
      overlayDirtyBounds: null,
      contentDisplayList: {
        bounds: secondPageRect,
        commands: [
          {
            id: "second",
            kind: "text",
            rect: { x: 8, y: 128, width: 32, height: 20 },
            text: "second",
            origin: { x: 8, y: 144 },
            font: "16px sans-serif",
            fillStyle: "#111827"
          }
        ]
      },
      overlayDisplayList: { bounds: secondPageRect, commands: [] }
    };
    const renderResult = {
      contentDisplayList: {
        bounds: { x: 0, y: 0, width: 80, height: 220 },
        commands: []
      },
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 80, height: 220 },
        commands: []
      },
      pageDisplayListChunks: {
        chunks: [firstChunk, secondChunk],
        chunksByPageIndex: {
          0: firstChunk,
          1: secondChunk
        }
      }
    } as unknown as Parameters<typeof paintSvgPageStackFrameContents>[1];

    adapter.applyGeometry(firstSurface, 0, firstPageRect);
    adapter.applyGeometry(secondSurface, 1, secondPageRect);
    paintSvgPageStackFrameContents(frames, renderResult);

    expect(firstSurface.content.querySelector("text")?.textContent).toBe("first");
    expect(secondSurface.content.querySelector("text")?.textContent).toBe("second");
  });

  it("ignores non-paint command metadata when reusing cached page content", () => {
    const adapter = createSvgPageSurfaceAdapter();
    const surface = adapter.createSurface(document);
    const pageRect = { x: 0, y: 0, width: 80, height: 100 };
    const paintCache = createSvgPageStackContentPaintCache();
    const firstRenderResult = withPageChunks({
      contentDisplayList: {
        bounds: pageRect,
        commands: [
          {
            id: "before",
            kind: "text",
            range: { from: 1, to: 7 },
            layer: "content",
            rect: { x: 8, y: 8, width: 32, height: 20 },
            text: "stable",
            origin: { x: 8, y: 24 },
            font: "16px sans-serif",
            fillStyle: "#111827"
          }
        ]
      }
    }, [pageRect]);
    const secondRenderResult = withPageChunks({
      contentDisplayList: {
        bounds: pageRect,
        commands: [
          {
            id: "after",
            kind: "text",
            range: { from: 2, to: 8 },
            rect: { x: 8, y: 8, width: 32, height: 20 },
            text: "stable",
            origin: { x: 8, y: 24 },
            font: "16px sans-serif",
            fillStyle: "#111827"
          }
        ]
      }
    }, [pageRect]);

    adapter.applyGeometry(surface, 0, pageRect);
    paintSvgPageFrameContent(
      { pageIndex: 0, pageRect, surface },
      firstRenderResult,
      { contentPaintCache: paintCache }
    );
    const firstContentGroup = surface.content.querySelector('[data-qk-layer="content"]');
    paintSvgPageFrameContent(
      { pageIndex: 0, pageRect, surface },
      secondRenderResult,
      { contentPaintCache: paintCache }
    );

    expect(surface.content.querySelector('[data-qk-layer="content"]')).toBe(firstContentGroup);
    expect(surface.content.querySelector("text")?.textContent).toBe("stable");
    expect(paintCache.snapshot()).toMatchObject({ hits: 1, misses: 1, stores: 1 });
  });

  it("skips page-content bucketing when every SVG page content cache hits", () => {
    const adapter = createSvgPageSurfaceAdapter();
    const firstSurface = adapter.createSurface(document);
    const secondSurface = adapter.createSurface(document);
    const firstPageRect = { x: 0, y: 0, width: 80, height: 100 };
    const secondPageRect = { x: 0, y: 120, width: 80, height: 100 };
    const paintCache = createSvgPageStackContentPaintCache();
    const renderResult = withPageChunks({
      contentDisplayList: {
        bounds: { x: 0, y: 0, width: 80, height: 220 },
        commands: [
          {
            id: "first",
            kind: "text",
            rect: { x: 8, y: 8, width: 32, height: 20 },
            text: "first",
            origin: { x: 8, y: 24 },
            font: "16px sans-serif",
            fillStyle: "#111827"
          },
          {
            id: "second",
            kind: "text",
            rect: { x: 8, y: 128, width: 32, height: 20 },
            text: "second",
            origin: { x: 8, y: 144 },
            font: "16px sans-serif",
            fillStyle: "#111827"
          }
        ]
      }
    }, [firstPageRect, secondPageRect]);
    const frames = [
      { pageIndex: 0, pageRect: firstPageRect, surface: firstSurface },
      { pageIndex: 1, pageRect: secondPageRect, surface: secondSurface }
    ];

    adapter.applyGeometry(firstSurface, 0, firstPageRect);
    adapter.applyGeometry(secondSurface, 1, secondPageRect);
    paintSvgPageStackFrameContents(frames, renderResult, {
      contentPaintCache: paintCache
    });
    const firstContentGroup = firstSurface.content.querySelector(
      '[data-qk-layer="content"]'
    );
    const secondContentGroup = secondSurface.content.querySelector(
      '[data-qk-layer="content"]'
    );
    const phases: string[] = [];

    paintSvgPageStackFrameContents(frames, renderResult, {
      contentPaintCache: paintCache,
      trace: (phase) => {
        phases.push(phase.name);
      }
    });

    expect(phases).not.toContain("svg-page-content-bucket");
    expect(firstSurface.content.querySelector('[data-qk-layer="content"]')).toBe(
      firstContentGroup
    );
    expect(secondSurface.content.querySelector('[data-qk-layer="content"]')).toBe(
      secondContentGroup
    );
    expect(paintCache.snapshot()).toMatchObject({ hits: 2, misses: 2, stores: 2 });
  });

  it("skips unchanged page overlay synchronization", () => {
    const adapter = createSvgPageSurfaceAdapter();
    const surface = adapter.createSurface(document);
    const pageRect = { x: 0, y: 0, width: 80, height: 100 };
    const renderResult = withPageChunks({
      overlayDisplayList: {
        bounds: pageRect,
        commands: []
      }
    }, [pageRect]);
    const validity = new QuirePageSurfacePaintValidityCache<SVGSVGElement>();

    adapter.applyGeometry(surface, 0, pageRect);
    paintSvgPageStackFrameOverlays(
      [{ pageIndex: 0, pageRect, surface }],
      renderResult,
      true,
      { validity }
    );
    const firstContentGroup = surface.overlay.querySelector('[data-qk-layer="content"]');
    paintSvgPageStackFrameOverlays(
      [{ pageIndex: 0, pageRect, surface }],
      renderResult,
      true,
      { validity }
    );

    expect(surface.overlay.querySelector('[data-qk-layer="content"]')).toBe(
      firstContentGroup
    );
  });

  it("batches page overlay bucketing before synchronizing mounted frames", () => {
    const adapter = createSvgPageSurfaceAdapter();
    const firstSurface = adapter.createSurface(document);
    const secondSurface = adapter.createSurface(document);
    const firstPageRect = { x: 0, y: 0, width: 80, height: 100 };
    const secondPageRect = { x: 0, y: 120, width: 80, height: 100 };
    const renderResult = withPageChunks({
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 80, height: 220 },
        commands: [
          {
            id: "first-selection",
            kind: "fill-rect",
            rect: { x: 8, y: 8, width: 32, height: 20 },
            fillStyle: "rgba(59,130,246,0.25)"
          },
          {
            id: "second-selection",
            kind: "fill-rect",
            rect: { x: 8, y: 128, width: 32, height: 20 },
            fillStyle: "rgba(59,130,246,0.25)"
          }
        ]
      }
    }, [firstPageRect, secondPageRect]);
    const frames = [
      { pageIndex: 0, pageRect: firstPageRect, surface: firstSurface },
      { pageIndex: 1, pageRect: secondPageRect, surface: secondSurface }
    ];
    const phases: string[] = [];
    const validity = new QuirePageSurfacePaintValidityCache<SVGSVGElement>();

    adapter.applyGeometry(firstSurface, 0, firstPageRect);
    adapter.applyGeometry(secondSurface, 1, secondPageRect);
    paintSvgPageStackFrameOverlays(frames, renderResult, true, {
      validity,
      trace: (phase) => {
        phases.push(phase.name);
      }
    });

    expect(phases.filter((phase) => phase === "svg-page-overlay-bucket")).toHaveLength(1);
    expect(firstSurface.overlay.querySelectorAll("rect")).toHaveLength(1);
    expect(secondSurface.overlay.querySelectorAll("rect")).toHaveLength(1);
  });
});
