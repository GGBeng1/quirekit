import { describe, expect, it } from "vitest";
import { orderProofingVisit } from "./order";

describe("orderProofingVisit", () => {
  it("visits the caret's block, then the visible part, then everything from the caret on", () => {
    const dirty = [{ from: 0, to: 100 }, { from: 200, to: 300 }];

    expect(orderProofingVisit(dirty, 50, { from: 220, to: 260 })).toEqual([
      { from: 50, to: 51 },
      { from: 220, to: 260 },
      { from: 50, to: 100 },
      { from: 200, to: 300 },
      { from: 0, to: 50 }
    ]);
  });

  it("keeps the plain caret order without a visible interval or dirty text under the caret", () => {
    expect(orderProofingVisit([{ from: 200, to: 300 }], 50, null)).toEqual([{ from: 200, to: 300 }]);
  });
});
