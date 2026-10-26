import { describe, expect, it } from "vitest";
import { resolveQuireTextFragmentRunRect } from "./run-geometry";
import type { QuireTextFragment } from "./types";

/**
 * Creates a minimal fragment for run-geometry tests.
 *
 * @param metrics - Optional run ascent and descent.
 * @returns Text fragment with a line box taller than the small run.
 */
function createFragment(
  metrics: { readonly runAscent?: number; readonly runDescent?: number } = {}
): QuireTextFragment {
  return {
    id: "fragment",
    text: "small",
    range: { from: 1, to: 6 },
    rect: { x: 10, y: 20, width: 40, height: 34 },
    font: "13px sans-serif",
    lineHeight: 34,
    baseline: 46,
    ...metrics,
    caretStops: [
      { position: { pos: 1, bias: 1 }, localX: 0 },
      { position: { pos: 6, bias: -1 }, localX: 40 }
    ]
  };
}

describe("resolveQuireTextFragmentRunRect", () => {
  it("uses run ascent and descent instead of a taller sibling's line box", () => {
    expect(resolveQuireTextFragmentRunRect(
      createFragment({ runAscent: 12, runDescent: 4 })
    )).toEqual({ x: 10, y: 34, width: 40, height: 16 });
  });

  it("keeps the legacy line box when run metrics are unavailable", () => {
    expect(resolveQuireTextFragmentRunRect(createFragment())).toEqual({
      x: 10,
      y: 20,
      width: 40,
      height: 34
    });
  });
});
