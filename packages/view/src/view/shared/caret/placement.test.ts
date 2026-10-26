import { describe, expect, it } from "vitest";
import { resolveMountedDomCaretPlacement } from "./placement";
import type { QuireViewRenderResult } from "../../types";

/**
 * Builds a render result carrying a single caret rectangle.
 *
 * @param rect - Document-space caret rectangle.
 * @returns Render result with the caret in its selection geometry.
 */
function renderResultWithCaret(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): QuireViewRenderResult {
  return {
    selectionGeometry: {
      carets: [{ position: { pos: 2, bias: 0 }, rect }],
      ranges: []
    }
  } as unknown as QuireViewRenderResult;
}

describe("resolveMountedDomCaretPlacement", () => {
  it("returns the caret document rectangle directly without client conversion", () => {
    const placement = resolveMountedDomCaretPlacement({
      renderResult: renderResultWithCaret({ x: 88, y: 104, width: 2, height: 20 })
    });

    expect(placement).toEqual({
      left: 88,
      top: 104,
      width: 2,
      height: 20,
      color: "#111827"
    });
  });

  it("uses the caret color override from display-list styles", () => {
    const placement = resolveMountedDomCaretPlacement({
      renderResult: renderResultWithCaret({ x: 10, y: 20, width: 1, height: 18 }),
      displayListStyles: { caretFillStyle: "#0f172a" }
    });

    expect(placement?.color).toBe("#0f172a");
  });

  it("floors the caret width to a minimum of one document pixel", () => {
    const placement = resolveMountedDomCaretPlacement({
      renderResult: renderResultWithCaret({ x: 0, y: 0, width: 0, height: 16 })
    });

    expect(placement?.width).toBe(1);
  });

  it("returns undefined when the selection has no caret", () => {
    const placement = resolveMountedDomCaretPlacement({
      renderResult: {
        selectionGeometry: { carets: [], ranges: [] }
      } as unknown as QuireViewRenderResult
    });

    expect(placement).toBeUndefined();
  });
});
