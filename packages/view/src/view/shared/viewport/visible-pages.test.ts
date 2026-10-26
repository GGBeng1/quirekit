import { describe, expect, it } from "vitest";
import type { QuireRect } from "@quirekit/renderer";
import {
  resolveMountedVisiblePageIndices,
  resolveVisiblePageIndices
} from "./visible-pages";

/**
 * Builds a stacked, full-width page rectangle.
 *
 * @param y - Page top in document space.
 * @param height - Page height.
 * @returns Page rectangle in document space.
 */
function rect(y: number, height: number): QuireRect {
  return { x: 0, y, width: 100, height };
}

/** Three 100px-tall pages stacked with a 20px gap between them. */
const pages: readonly QuireRect[] = [rect(0, 100), rect(120, 100), rect(240, 100)];

describe("resolveVisiblePageIndices", () => {
  it("returns the single page fully covering the viewport", () => {
    expect(resolveVisiblePageIndices(pages, { x: 0, y: 10, width: 100, height: 50 }, 0)).toEqual([
      0
    ]);
  });

  it("returns both pages a viewport partially overlaps", () => {
    // Viewport spans the bottom of page 0 and the top of page 1.
    expect(resolveVisiblePageIndices(pages, { x: 0, y: 90, width: 100, height: 50 }, 0)).toEqual([
      0, 1
    ]);
  });

  it("includes buffer neighbours above and below the visible set", () => {
    // Only page 1 intersects; buffer of 1 adds pages 0 and 2.
    expect(resolveVisiblePageIndices(pages, { x: 0, y: 130, width: 100, height: 40 }, 1)).toEqual([
      0, 1, 2
    ]);
  });

  it("clamps the buffer at the document edges", () => {
    // Page 0 visible; buffer of 5 cannot go below index 0, stops at last page.
    expect(resolveVisiblePageIndices(pages, { x: 0, y: 0, width: 100, height: 30 }, 5)).toEqual([
      0, 1, 2
    ]);
  });

  it("returns an empty array when no pages exist", () => {
    expect(resolveVisiblePageIndices([], { x: 0, y: 0, width: 100, height: 50 }, 2)).toEqual([]);
  });

  it("returns an empty array when the viewport intersects no page", () => {
    // Viewport sits entirely past the last page.
    expect(
      resolveVisiblePageIndices(pages, { x: 0, y: 1000, width: 100, height: 50 }, 0)
    ).toEqual([]);
  });

  it("does not mount a long document for an empty or invalid viewport", () => {
    const longDocument = Array.from({ length: 2000 }, (_, index) => rect(index * 120, 100));
    for (const width of [0, -1, Number.NaN]) {
      expect(resolveVisiblePageIndices(longDocument, { x: 0, y: 20, width, height: 50 }, 1)).toEqual([]);
    }
  });

  it("returns every page when a tall viewport covers the document", () => {
    expect(resolveVisiblePageIndices(pages, { x: 0, y: 0, width: 100, height: 400 }, 0)).toEqual([
      0, 1, 2
    ]);
  });
});

describe("resolveMountedVisiblePageIndices", () => {
  it("uses the viewport coordinator visible set when available", () => {
    expect(resolveMountedVisiblePageIndices({
      coordinator: {
        getVisibleRegion: () => ({ x: 0, y: 120, width: 100, height: 80 }),
        getVisiblePageIndices: () => [1],
        subscribe: () => () => {},
        destroy: () => {}
      },
      pageRects: pages,
      bufferPages: 1
    })).toEqual([1]);
  });

  it("keeps an empty visible set when the mounted viewport cannot report visibility", () => {
    expect(resolveMountedVisiblePageIndices({
      coordinator: {
        getVisibleRegion: () => ({ x: 0, y: 0, width: 0, height: 0 }),
        getVisiblePageIndices: () => [],
        subscribe: () => () => {},
        destroy: () => {}
      },
      pageRects: pages
    })).toEqual([]);
  });

  it("returns an empty set without a coordinator", () => {
    expect(resolveMountedVisiblePageIndices({
      pageRects: pages
    })).toEqual([]);
  });
});
