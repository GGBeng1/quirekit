import { describe, expect, it } from "vitest";
import { findQuireSourceFlowPage, isQuireSourcePositionInRanges } from "./lookup";

describe("complete source-flow queries", () => {
  it("uses the following band at a page/column boundary and rejects gaps", () => {
    const bands = [{ from: 0, to: 10, pageIndex: 0 }, { from: 10, to: 20, pageIndex: 0 }, { from: 25, to: 35, pageIndex: 1 }];
    expect(findQuireSourceFlowPage(bands, 10)).toBe(0);
    expect(findQuireSourceFlowPage(bands, 25)).toBe(1);
    expect(findQuireSourceFlowPage(bands, 22)).toBeNull();
    expect(findQuireSourceFlowPage(bands, -1)).toBeNull();
    expect(findQuireSourceFlowPage([], 0)).toBeNull();
  });
  it("keeps canonical source ranges half open", () => {
    const ranges = [{ from: 3, to: 5 }, { from: 7, to: 10 }];
    expect(isQuireSourcePositionInRanges(ranges, 3)).toBe(true);
    expect(isQuireSourcePositionInRanges(ranges, 5)).toBe(false);
    expect(isQuireSourcePositionInRanges(ranges, 7)).toBe(true);
    expect(isQuireSourcePositionInRanges([], 3)).toBe(false);
  });
});
