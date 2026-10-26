import type { QuireCaretGeometry } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import type { SvgTextMeasurement } from "../types";
import { buildSvgMeasuredCaretGeometry } from "./caret";

/**
 * Creates a browser measurement whose command carries a line box, not run metrics.
 * @param from - First source position rendered by the text node.
 * @param to - Last source position rendered by the text node.
 * @param x - Browser-measured horizontal position for the queried endpoint.
 * @returns Measurement with a 24-pixel line box and deterministic horizontal data.
 */
function measurement(from: number, to: number, x: number): SvgTextMeasurement {
  return {
    root: {} as SVGSVGElement,
    command: {
      id: `text-${from}-${to}`, kind: "text", text: "abc",
      range: { from, to }, rect: { x: 10, y: 248, width: 30, height: 24 },
      origin: { x: 10, y: 267 }, font: "16px sans-serif", fillStyle: "#000"
    },
    resolveTextLength: () => 30,
    resolveSubStringLength: () => 10,
    resolveXAtOffset: () => x,
    resolveOffsetAtPoint: () => null,
    resolveRangeRects: () => null
  };
}

describe("SVG measured caret vertical ownership", () => {
  it.each([
    { y: 251, height: 19 },
    { y: 258, height: 8 }
  ])("retains run or clipped geometry $y/$height while refining browser x", rect => {
    const retained: QuireCaretGeometry = {
      position: { pos: 2, bias: -1 }, rect: { x: 18, width: 1, ...rect }
    };
    expect(buildSvgMeasuredCaretGeometry([retained], [measurement(1, 4, 20.25)]))
      .toEqual([{ position: { pos: 2, bias: 1 }, rect: { x: 20.25, width: 1, ...rect } }]);
  });

  it("keeps both BiDi candidates and their endpoint biases on the retained run band", () => {
    const retained: QuireCaretGeometry = {
      position: { pos: 4, bias: 1 }, rect: { x: 40, y: 251, width: 1, height: 19 }
    };
    expect(buildSvgMeasuredCaretGeometry([retained], [measurement(1, 4, 40), measurement(4, 7, 70)]))
      .toEqual([
        { position: { pos: 4, bias: -1 }, rect: { x: 40, y: 251, width: 1, height: 19 } },
        { position: { pos: 4, bias: 1 }, rect: { x: 70, y: 251, width: 1, height: 19 } }
      ]);
  });
});
