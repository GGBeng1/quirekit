import { describe, expect, it } from "vitest";
import {
  baselineQuireLineBreakerPolicy,
  describeQuireLineBreakSegment,
  isQuireHardBreakSegment,
  mergeQuireLineBreakMetadata,
  resolveQuireLineBreakerPolicy
} from "./segment";

describe("canvas line breaker segment policy", () => {
  it("classifies baseline grapheme roles and break opportunities", () => {
    expect(describeQuireLineBreakSegment("a")).toMatchObject({
      kind: "word",
      breakAfter: false,
      nonBreakingGlue: false
    });
    expect(describeQuireLineBreakSegment("你")).toMatchObject({
      kind: "grapheme",
      breakAfter: false,
      nonBreakingGlue: false
    });
    expect(describeQuireLineBreakSegment(" ")).toMatchObject({
      kind: "space",
      breakAfter: true,
      nonBreakingGlue: false
    });
  });

  it("tracks non-breaking glue and discretionary break markers", () => {
    expect(describeQuireLineBreakSegment("\u00a0")).toMatchObject({
      kind: "word",
      breakAfter: false,
      nonBreakingGlue: true
    });
    expect(describeQuireLineBreakSegment("\u00ad")).toMatchObject({
      kind: "word",
      breakAfter: true,
      breakMarker: "-"
    });
  });

  it("merges unit metadata from segment metadata", () => {
    expect(
      mergeQuireLineBreakMetadata([
        describeQuireLineBreakSegment("a"),
        describeQuireLineBreakSegment("-")
      ])
    ).toMatchObject({
      breakAfter: true,
      nonBreakingGlue: false
    });
  });

  it("recognizes explicit hard break segments", () => {
    expect(isQuireHardBreakSegment("\n")).toBe(true);
    expect(isQuireHardBreakSegment("\u2029")).toBe(true);
    expect(isQuireHardBreakSegment(" ")).toBe(false);
  });

  it("exposes the baseline policy as the default policy object", () => {
    expect(resolveQuireLineBreakerPolicy().name).toBe("baseline");
    expect(resolveQuireLineBreakerPolicy()).toBe(baselineQuireLineBreakerPolicy);
    expect(baselineQuireLineBreakerPolicy.describeSegment("-")).toMatchObject({
      kind: "word",
      breakAfter: true
    });
  });
});
