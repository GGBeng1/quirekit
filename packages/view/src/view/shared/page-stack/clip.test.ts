import type { QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  resolveQuirePageStackRenderClipRects,
  shouldRefreshQuirePageStackDisplayListClip
} from "./clip";

describe("resolveQuirePageStackRenderClipRects", () => {
  it("returns visible page rectangles for incremental render reasons", () => {
    const pageRects = [
      rect(0),
      rect(100),
      rect(200)
    ];

    expect(resolveQuirePageStackRenderClipRects({
      reason: "transaction",
      pageRects,
      visiblePageIndices: [0, 1]
    })).toEqual([pageRects[0], pageRects[1]]);
    expect(resolveQuirePageStackRenderClipRects({
      reason: "composition",
      pageRects,
      visiblePageIndices: [1]
    })).toEqual([pageRects[1]]);
    expect(resolveQuirePageStackRenderClipRects({
      reason: "fill",
      pageRects,
      visiblePageIndices: [1, 2]
    })).toEqual([
      pageRects[1],
      { x: 0, y: 200, width: 100, height: 180 }
    ]);
  });

  it("reserves one speculative page after a visible retained tail", () => {
    expect(resolveQuirePageStackRenderClipRects({
      reason: "transaction",
      pageRects: [rect(0)],
      visiblePageIndices: [0],
      pageGeometry: {
        pageRect: { x: 0, y: 0, width: 100, height: 80 },
        bodyRect: { x: 10, y: 10, width: 80, height: 60 },
        pageGap: 20
      }
    })).toEqual([{ x: 0, y: 0, width: 100, height: 180 }]);
  });

  it("covers the visible span and page buffer when a retained tail expands", () => {
    expect(resolveQuirePageStackRenderClipRects({
      reason: "transaction",
      pageRects: [{ x: 0, y: 0, width: 794, height: 1122 }],
      visiblePageIndices: [0],
      visibleRegion: { x: 0, y: 0, width: 794, height: 1240 },
      pageGeometry: {
        pageRect: { x: 0, y: 0, width: 794, height: 1122 },
        bodyRect: { x: 120, y: 96, width: 554, height: 930 },
        pageGap: 0
      },
      bufferPages: 1
    })).toEqual([{ x: 0, y: 0, width: 794, height: 3366 }]);
  });

  it("keeps explicit full renders unclipped", () => {
    expect(resolveQuirePageStackRenderClipRects({
      reason: "manual",
      pageRects: [rect(0)],
      visiblePageIndices: [0]
    })).toBeUndefined();
  });

  it.each(["scroll", "image-paint"])("projects only the visible page window for %s", (reason) => {
    const pageRects = [rect(0), rect(100), rect(200), rect(300)];
    for (const visiblePageIndices of [[0], [2], [0]]) {
      expect(resolveQuirePageStackRenderClipRects({
        reason, pageRects, visiblePageIndices
      })).toEqual(visiblePageIndices.map(index => pageRects[index]));
    }
  });

  it("never clips a replacement document from retained old pages", () => {
    expect(resolveQuirePageStackRenderClipRects({
      reason: "document-replace",
      pageRects: [rect(0), rect(100), rect(200), rect(300)],
      visiblePageIndices: [3]
    })).toBeUndefined();
  });

  it("keeps renders unclipped when visible page rectangles have no paintable area", () => {
    expect(resolveQuirePageStackRenderClipRects({
      reason: "composition",
      pageRects: [{ x: 0, y: 0, width: 120, height: 0 }],
      visiblePageIndices: [0]
    })).toBeUndefined();
  });

  it("clips the initial render from visible-region authority before pages exist", () => {
    expect(resolveQuirePageStackRenderClipRects({
      reason: "initial",
      pageRects: [],
      visiblePageIndices: [],
      visibleRegion: { x: 10, y: 1200, width: 800, height: 500 },
      pageGeometry: {
        pageRect: { x: 48, y: 52, width: 794, height: 1122 },
        bodyRect: { x: 168, y: 148, width: 554, height: 930 },
        pageGap: 40
      },
      bufferPages: 1
    })).toEqual([{ x: 10, y: 38, width: 800, height: 2824 }]);
  });

  it("keeps document-driven initial page geometry unclipped", () => {
    expect(resolveQuirePageStackRenderClipRects({
      reason: "initial",
      pageRects: [],
      visiblePageIndices: [],
      visibleRegion: { x: 10, y: 0, width: 800, height: 500 },
      bufferPages: 1
    })).toBeUndefined();
  });

  it("leaves the initial render unclipped without visible-region evidence", () => {
    expect(resolveQuirePageStackRenderClipRects({
      reason: "initial",
      pageRects: [],
      visiblePageIndices: []
    })).toBeUndefined();
  });
});

describe("shouldRefreshQuirePageStackDisplayListClip", () => {
  it("keeps clipped render results while visible pages stay inside clips", () => {
    expect(shouldRefreshQuirePageStackDisplayListClip({
      pageRects: [rect(0), rect(100)],
      visiblePageIndices: [0],
      clipRects: [rect(0)]
    })).toBe(false);
  });

  it("requests a refresh when scrolling needs an unclipped page", () => {
    expect(shouldRefreshQuirePageStackDisplayListClip({
      pageRects: [rect(0), rect(100)],
      visiblePageIndices: [1],
      clipRects: [rect(0)]
    })).toBe(true);
  });

  it("does not refresh unclipped render results", () => {
    expect(shouldRefreshQuirePageStackDisplayListClip({
      pageRects: [rect(0)],
      visiblePageIndices: [0]
    })).toBe(false);
  });
});

/**
 * Creates a page rectangle fixture.
 *
 * @param y - Page top.
 * @returns Page rectangle.
 */
function rect(y: number): QuireRect {
  return { x: 0, y, width: 100, height: 80 };
}
