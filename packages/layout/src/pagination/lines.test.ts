import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { groupQuireTextFragmentsIntoLines } from "./lines";

describe("groupQuireTextFragmentsIntoLines", () => {
  it("skips sorting when fragments are already in visual order", () => {
    const { result, sortCalls } = withArraySortSpy(() =>
      groupQuireTextFragmentsIntoLines([
        createFragment("line-0", 0, 0, 1, 6),
        createFragment("line-1", 0, 24, 6, 11)
      ])
    );

    expect(result).toEqual([
      { from: 1, to: 6, top: 0, bottom: 24 },
      { from: 6, to: 11, top: 24, bottom: 48 }
    ]);
    expect(sortCalls).toBe(0);
  });

  it("keeps the sorted fallback for out-of-order fragments", () => {
    const { result, sortCalls } = withArraySortSpy(() =>
      groupQuireTextFragmentsIntoLines([
        createFragment("line-1", 0, 24, 6, 11),
        createFragment("line-0", 0, 0, 1, 6)
      ])
    );

    expect(result).toEqual([
      { from: 1, to: 6, top: 0, bottom: 24 },
      { from: 6, to: 11, top: 24, bottom: 48 }
    ]);
    expect(sortCalls).toBe(1);
  });

  it("keeps a baseline-aligned glyph box with a different top on the same line", () => {
    // A list marker shares the body baseline, so a taller marker glyph starts above the body line box.
    const marker = { ...createFragment("marker", 0, -2, 1, 1), lineHeight: 23 };
    const result = groupQuireTextFragmentsIntoLines([
      marker,
      createFragment("line-0", 24, 0, 1, 6),
      createFragment("line-1", 0, 24, 6, 11)
    ]);

    expect(result).toEqual([
      { from: 1, to: 6, top: -2, bottom: 24 },
      { from: 6, to: 11, top: 24, bottom: 48 }
    ]);
  });
});

/**
 * Runs a callback while counting Array.sort calls in this test worker.
 *
 * @param callback - Synchronous code to run.
 * @returns Callback result and the observed sort call count.
 */
function withArraySortSpy<T>(
  callback: () => T
): { readonly result: T; readonly sortCalls: number } {
  const originalSort = Array.prototype.sort;
  let sortCalls = 0;

  Array.prototype.sort = function sortSpy<TItem>(
    this: TItem[],
    compareFn?: ((a: TItem, b: TItem) => number) | undefined
  ): TItem[] {
    sortCalls += 1;
    return originalSort.call(this, compareFn);
  };

  try {
    return {
      result: callback(),
      sortCalls
    };
  } finally {
    Array.prototype.sort = originalSort;
  }
}

/**
 * Creates a text fragment fixture for line-grouping tests.
 *
 * @param id - Fragment id.
 * @param x - Fragment x coordinate.
 * @param y - Fragment y coordinate.
 * @param from - Fragment document start.
 * @param to - Fragment document end.
 * @returns Text fragment fixture.
 */
function createFragment(
  id: string,
  x: number,
  y: number,
  from: number,
  to: number
): QuireTextFragment {
  return {
    id,
    text: id,
    range: { from, to },
    rect: { x, y, width: 20, height: 24 },
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: y + 18,
    caretStops: []
  };
}
