import type { QuireDisplayList, QuireRect } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import { planCanvasPageOverlayTiles } from "./overlay-tiles";

/** A4-sized page at a fractional document origin. */
const pageRect: QuireRect = { x: 12.5, y: 1200, width: 794, height: 1123 };

/**
 * @param commands - Overlay commands of one page.
 * @returns Page-scoped overlay display list.
 */
function list(commands: QuireDisplayList["commands"]): QuireDisplayList {
  return { bounds: pageRect, commands };
}

describe("sparse page overlay planning", () => {
  it("covers four body corner marks with a few small tiles instead of the page", () => {
    const left = pageRect.x + 96, right = pageRect.x + 698, top = pageRect.y + 96, bottom = pageRect.y + 1027;
    const corners = list([{
      id: "corners", kind: "path", rect: { x: left - 24, y: top - 24, width: 650, height: 979 },
      strokeStyle: "#999", lineWidth: 1,
      segments: [
        { kind: "move-to", point: { x: left - 24, y: top } }, { kind: "line-to", point: { x: left, y: top } },
        { kind: "line-to", point: { x: left, y: top - 24 } },
        { kind: "move-to", point: { x: right + 24, y: top } }, { kind: "line-to", point: { x: right, y: top } },
        { kind: "line-to", point: { x: right, y: top - 24 } },
        { kind: "move-to", point: { x: left - 24, y: bottom } }, { kind: "line-to", point: { x: left, y: bottom } },
        { kind: "line-to", point: { x: left, y: bottom + 24 } },
        { kind: "move-to", point: { x: right + 24, y: bottom } }, { kind: "line-to", point: { x: right, y: bottom } },
        { kind: "line-to", point: { x: right, y: bottom + 24 } }
      ]
    }]);

    const tiles = planCanvasPageOverlayTiles(corners, pageRect);
    // The bottom marks straddle a row boundary once their stroke reach is included.
    expect(tiles.map((tile) => [tile.x - pageRect.x, tile.y - pageRect.y]))
      .toEqual([[0, 0], [512, 0], [0, 768], [512, 768], [0, 1024], [512, 1024]]);
    // The last row stops at the page edge.
    expect(tiles.slice(4).map((tile) => [tile.width, tile.height])).toEqual([[256, 99], [256, 99]]);
  });

  it("falls back to the whole page for glyphs, unknown bounds and large ink", () => {
    const text = list([{ id: "t", kind: "text", rect: { x: pageRect.x + 10, y: pageRect.y + 10, width: 20, height: 10 }, text: "a", font: "10px serif", fillStyle: "#000" } as never]);
    expect(planCanvasPageOverlayTiles(text, pageRect)).toEqual([pageRect]);
    const selection = list([{ id: "s", kind: "fill-rect", rect: { x: pageRect.x, y: pageRect.y, width: 794, height: 900 }, fillStyle: "#00f" }]);
    expect(planCanvasPageOverlayTiles(selection, pageRect)).toEqual([pageRect]);
    const broken = list([{ id: "b", kind: "fill-rect", rect: { x: Number.NaN, y: 0, width: 1, height: 1 }, fillStyle: "#00f" }]);
    expect(planCanvasPageOverlayTiles(broken, pageRect)).toEqual([pageRect]);
  });

  it("keeps scattered small marks on tiles up to the tile budget", () => {
    const marks = (count: number) => list(Array.from({ length: count }, (_, index) => ({
      id: `m${index}`, kind: "fill-rect" as const, fillStyle: "#00f",
      rect: { x: pageRect.x + (index % 3) * 256 + 100, y: pageRect.y + Math.floor(index / 3) * 256 + 100, width: 8, height: 8 }
    })));
    expect(planCanvasPageOverlayTiles(marks(12), pageRect)).toHaveLength(12);
    expect(planCanvasPageOverlayTiles(marks(13), pageRect)).toEqual([pageRect]);
  });

  it("plans nothing for an empty overlay and ignores ink outside the page", () => {
    expect(planCanvasPageOverlayTiles(list([]), pageRect)).toEqual([]);
    const outside = list([{ id: "o", kind: "fill-rect", rect: { x: pageRect.x, y: pageRect.y - 40, width: 10, height: 10 }, fillStyle: "#00f" }]);
    expect(planCanvasPageOverlayTiles(outside, pageRect)).toEqual([]);
  });

  it("grows stroked path bounds by the miter reach across tile boundaries", () => {
    const edge = pageRect.x + 250;
    const stroke = list([{ id: "p", kind: "path", rect: { x: edge, y: pageRect.y + 10, width: 1, height: 1 },
      strokeStyle: "#000", lineWidth: 2,
      segments: [{ kind: "move-to", point: { x: edge, y: pageRect.y + 10 } }, { kind: "line-to", point: { x: edge + 1, y: pageRect.y + 11 } }] }]);
    expect(planCanvasPageOverlayTiles(stroke, pageRect).map((tile) => tile.x - pageRect.x)).toEqual([0, 256]);
  });
});
