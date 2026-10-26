import { describe, expect, it } from "vitest";
import { resolveQuireDisplayOwnerPageIndexes } from "./identity";

/** Three stacked pages. */
const pages = [0, 1, 2].map(pageIndex => ({ pageIndex, pageRect: { x: 0, y: pageIndex * 100, width: 100, height: 100 } }));

describe("display owner page membership", () => {
  it("lists every intersecting page and shares single-page and empty results", () => {
    expect(resolveQuireDisplayOwnerPageIndexes({ x: 0, y: 150, width: 10, height: 100 }, pages)).toEqual([1, 2]);
    expect(resolveQuireDisplayOwnerPageIndexes({ x: 0, y: 50, width: 10, height: 220 }, pages)).toEqual([0, 1, 2]);
    const single = resolveQuireDisplayOwnerPageIndexes({ x: 0, y: 120, width: 10, height: 10 }, pages);
    expect(single).toEqual([1]);
    expect(resolveQuireDisplayOwnerPageIndexes({ x: 5, y: 110, width: 1, height: 1 }, pages)).toBe(single);
    expect(Object.isFrozen(single)).toBe(true);
    expect(resolveQuireDisplayOwnerPageIndexes({ x: 0, y: 400, width: 10, height: 10 }, pages)).toEqual([]);
    // Touching an edge has no positive-area overlap.
    expect(resolveQuireDisplayOwnerPageIndexes({ x: 0, y: 90, width: 10, height: 10 }, pages)).toEqual([0]);
  });
});
