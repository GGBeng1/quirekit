import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuirePageBodyProjection } from "../types";
import {
  translateQuireTextFragment,
  translateQuireTextFragments
} from "./text";

describe("page projection text translation", () => {
  it("reuses projected fragment objects for the same source fragment and offset", () => {
    const fragment = createTextFragment();
    const projection = createProjection({ dx: 10, dy: 100 });
    const first = translateQuireTextFragment(fragment, projection);
    const second = translateQuireTextFragment(fragment, projection);

    expect(first).toBe(second);
    expect(first).toEqual(
      expect.objectContaining({
        rect: { x: 12, y: 104, width: 20, height: 24 },
        baseline: 118
      })
    );
  });

  it("misses the projected fragment cache when the offset changes", () => {
    const fragment = createTextFragment();
    const first = translateQuireTextFragment(
      fragment,
      createProjection({ dx: 10, dy: 100 })
    );
    const second = translateQuireTextFragment(
      fragment,
      createProjection({ dx: 12, dy: 100 })
    );

    expect(second).not.toBe(first);
    expect(second.rect.x).toBe(14);
  });

  it("reuses projected fragment arrays for the same source array and offset", () => {
    const fragments = [createTextFragment()];
    const projection = createProjection({ dx: 10, dy: 100 });
    const first = translateQuireTextFragments(fragments, projection);
    const second = translateQuireTextFragments(fragments, projection);

    expect(second).toBe(first);
    expect(second[0]?.rect.y).toBe(104);
  });

  it("misses the projected fragment array cache when the offset changes", () => {
    const fragments = [createTextFragment()];
    const first = translateQuireTextFragments(
      fragments,
      createProjection({ dx: 10, dy: 100 })
    );
    const second = translateQuireTextFragments(
      fragments,
      createProjection({ dx: 10, dy: 120 })
    );

    expect(second).not.toBe(first);
    expect(second[0]?.rect.y).toBe(124);
  });

});

/**
 * Creates a source text fragment fixture.
 *
 * @returns Text fragment in source-flow coordinates.
 */
function createTextFragment(): QuireTextFragment {
  return {
    id: "paragraph-0:text-0",
    text: "AB",
    range: { from: 1, to: 3 },
    rect: { x: 2, y: 4, width: 20, height: 24 },
    font: "16px serif",
    lineHeight: 24,
    baseline: 18,
    caretStops: []
  };
}

/**
 * Creates a page-body projection fixture.
 *
 * @param options - Projection offsets.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Horizontal projection offset. */
  readonly dx: number;
  /** Vertical projection offset. */
  readonly dy: number;
}): QuirePageBodyProjection {
  return {
    page: {
      pageIndex: 0,
      range: { from: 1, to: 3 },
      pageRect: { x: 0, y: 0, width: 100, height: 100 },
      bodyRect: { x: 0, y: 0, width: 100, height: 100 },
      rect: { x: 0, y: 0, width: 100, height: 100 },
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: options.dx,
    dy: options.dy
  };
}
