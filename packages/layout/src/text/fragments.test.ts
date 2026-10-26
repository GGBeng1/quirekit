import { describe, expect, it } from "vitest";
import {
  buildQuireTextFragment,
  cloneQuireTextFragmentWithLazyCaretStops,
  findQuireTextCaretStopAtXWithinRect,
  type QuireTextFragment,
  type QuireTextMeasurer
} from ".";

const fixedMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: Array.from(text).length * 10 })
};

describe("canvas text fragments", () => {
  it("builds measured caret stops for a single-line text fragment", () => {
    expect(
      buildQuireTextFragment({
        id: "fragment-0",
        text: "abcd",
        range: { from: 1, to: 5 },
        rect: { x: 10, y: 20, width: 300, height: 24 },
        font: "16px sans-serif",
        lineHeight: 24,
        baseline: 37,
        measurer: fixedMeasurer
      })
    ).toEqual({
      id: "fragment-0",
      text: "abcd",
      range: { from: 1, to: 5 },
      rect: { x: 10, y: 20, width: 40, height: 24 },
      font: "16px sans-serif",
      lineHeight: 24,
      baseline: 37,
      caretStops: [
        { position: { pos: 1, bias: 1 }, localX: 0 },
        { position: { pos: 2, bias: 0 }, localX: 10 },
        { position: { pos: 3, bias: 0 }, localX: 20 },
        { position: { pos: 4, bias: 0 }, localX: 30 },
        { position: { pos: 5, bias: -1 }, localX: 40 }
      ]
    });
  });

  it("builds caret stops from shaped clusters when available", () => {
    const shapedMeasurer: QuireTextMeasurer = {
      measureText: () => ({ width: 999 }),
      shapeRun: () => ({
        clusters: [
          { from: 0, to: 1, x: 0, advance: 7, rtl: false },
          { from: 1, to: 3, x: 7, advance: 13, rtl: false }
        ],
        width: 20,
        ascent: 14,
        descent: 4
      })
    };

    expect(
      buildQuireTextFragment({
        id: "fragment-0",
        text: "abc",
        range: { from: 10, to: 13 },
        rect: { x: 10, y: 20, width: 300, height: 24 },
        font: "16px sans-serif",
        lineHeight: 24,
        baseline: 37,
        measurer: shapedMeasurer
      }).caretStops
    ).toEqual([
      { position: { pos: 10, bias: 1 }, localX: 0 },
      { position: { pos: 11, bias: 0 }, localX: 7 },
      { position: { pos: 13, bias: -1 }, localX: 20 }
    ]);
  });

  it("maps clipped text fragment x positions to visible caret stops", () => {
    const fragment = {
      id: "fragment-0",
      text: "visible hidden",
      range: { from: 1, to: 14 },
      rect: { x: 10, y: 20, width: 160, height: 24 },
      font: "16px sans-serif",
      lineHeight: 24,
      baseline: 37,
      caretStops: [
        { position: { pos: 1, bias: 1 }, localX: 0 },
        { position: { pos: 8, bias: -1 }, localX: 60 },
        { position: { pos: 14, bias: -1 }, localX: 140 }
      ]
    } satisfies QuireTextFragment;

    expect(
      findQuireTextCaretStopAtXWithinRect(
        fragment,
        139,
        { x: 10, y: 20, width: 120, height: 24 }
      ).position
    ).toEqual({ pos: 8, bias: -1 });
  });

  it("keeps a boundary caret stop when clipping only differs by floating point noise", () => {
    const fragment = {
      id: "fragment-0",
      text: "marks",
      range: { from: 1, to: 6 },
      rect: { x: 10, y: 20, width: 167.47265624999997, height: 24 },
      font: "16px sans-serif",
      lineHeight: 24,
      baseline: 37,
      caretStops: [
        { position: { pos: 1, bias: 1 }, localX: 0 },
        { position: { pos: 5, bias: 0 }, localX: 153.34845632530119 },
        { position: { pos: 6, bias: -1 }, localX: 167.47265624999997 }
      ]
    } satisfies QuireTextFragment;

    expect(
      findQuireTextCaretStopAtXWithinRect(
        fragment,
        177.47265624999997,
        { x: 10, y: 20, width: 167.47265624999994, height: 24 }
      ).position
    ).toEqual({ pos: 6, bias: -1 });
  });

  it("preserves shaped glyph metadata when the measurer provides it", () => {
    const shapedMeasurer: QuireTextMeasurer = {
      measureText: () => ({ width: 20 }),
      shapeRun: () => ({
        clusters: [
          { from: 0, to: 1, x: 0, advance: 20, rtl: false }
        ],
        width: 20,
        ascent: 14,
        descent: 4,
        glyphs: [
          {
            glyphId: 20320,
            sourceCluster: 0,
            x: 0,
            y: 0,
            xAdvance: 20,
            yAdvance: 0,
            xOffset: 0,
            yOffset: 0,
            fontId: "noto-sans-hans",
            fontFamily: "Noto Sans Hans"
          }
        ]
      })
    };

    expect(
      buildQuireTextFragment({
        id: "fragment-0",
        text: "你",
        range: { from: 1, to: 2 },
        rect: { x: 10, y: 20, width: 300, height: 24 },
        font: "16px sans-serif",
        lineHeight: 24,
        baseline: 37,
        measurer: shapedMeasurer
      }).shapedRun?.glyphs
    ).toEqual([
      {
        glyphId: 20320,
        sourceCluster: 0,
        x: 0,
        y: 0,
        xAdvance: 20,
        yAdvance: 0,
        xOffset: 0,
        yOffset: 0,
        fontId: "noto-sans-hans",
        fontFamily: "Noto Sans Hans"
      }
    ]);
  });

  it("clones text fragments without opening lazy caret stops", () => {
    const stops: QuireTextFragment["caretStops"] = [
      { position: { pos: 1, bias: 1 }, localX: 0 },
      { position: { pos: 2, bias: -1 }, localX: 10 }
    ];
    const source = { ...createTextFragmentForLazyClone(stops), language: "zh-CN" };
    let reads = 0;
    Object.defineProperty(source, "caretStops", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return stops;
      }
    });

    const clone = cloneQuireTextFragmentWithLazyCaretStops({
      source,
      id: "fragment-0:translated",
      range: { from: 6, to: 7 },
      rect: { x: 20, y: 30, width: 10, height: 24 },
      baseline: 47,
      caretStopRangeDelta: 5
    });

    expect(reads).toBe(0);
    expect(clone.rect).toEqual({ x: 20, y: 30, width: 10, height: 24 });
    expect(clone.baseline).toBe(47);
    expect(clone.language).toBe("zh-CN");
    expect(reads).toBe(0);

    const firstRead = clone.caretStops;
    const secondRead = clone.caretStops;
    expect(firstRead).toEqual([
      { position: { pos: 6, bias: 1 }, localX: 0 },
      { position: { pos: 7, bias: -1 }, localX: 10 }
    ]);
    expect(secondRead).toBe(firstRead);
    expect(reads).toBe(1);
  });

  it("composes lazy caret-stop shifts through clone chains", () => {
    const stops: QuireTextFragment["caretStops"] = [
      { position: { pos: 1, bias: 1 }, localX: 0 },
      { position: { pos: 3, bias: -1 }, localX: 20 }
    ];
    const source = createTextFragmentForLazyClone(stops);
    let reads = 0;
    Object.defineProperty(source, "caretStops", {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return stops;
      }
    });

    const first = cloneQuireTextFragmentWithLazyCaretStops({
      source,
      id: "fragment-0:first",
      range: { from: 5, to: 7 },
      rect: source.rect,
      baseline: source.baseline,
      caretStopRangeDelta: 4
    });
    const second = cloneQuireTextFragmentWithLazyCaretStops({
      source: first,
      id: "fragment-0:second",
      range: { from: 8, to: 10 },
      rect: first.rect,
      baseline: first.baseline,
      caretStopRangeDelta: 3
    });

    expect(reads).toBe(0);
    expect(second.caretStops).toEqual([
      { position: { pos: 8, bias: 1 }, localX: 0 },
      { position: { pos: 10, bias: -1 }, localX: 20 }
    ]);
    expect(reads).toBe(1);
  });
});

/**
 * Creates a text fragment fixture for lazy-clone tests.
 *
 * @param caretStops - Caret stops installed on the source fragment.
 * @returns Text fragment fixture.
 */
function createTextFragmentForLazyClone(
  caretStops: QuireTextFragment["caretStops"]
): QuireTextFragment {
  return {
    id: "fragment-0",
    text: "AB",
    range: { from: 1, to: 3 },
    rect: { x: 10, y: 20, width: 20, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: 37,
    caretStops
  };
}

it("scales standalone fragment caret geometry without requiring precomputed stops", () => {
  const fragment = buildQuireTextFragment({
    id: "scale", text: "AB", range: { from: 10, to: 12 }, font: "16px Fixture",
    rect: { x: 20, y: 30, width: 0, height: 20 }, lineHeight: 20, baseline: 46, horizontalScale: 2,
    measurer: { measureText: text => ({ width: text.length * 10 }) }
  });
  expect(fragment.rect).toEqual({ x: 20, y: 30, width: 40, height: 20 });
  expect(fragment.caretStops.map(stop => [stop.position.pos, stop.localX])).toEqual([[10, 0], [11, 20], [12, 40]]);
});
