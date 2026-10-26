import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import { describe, expect, it } from "vitest";
import { matchesQuireLogicalRegion, matchesQuireRegionOccurrence } from "./region";

const source: QuireLayoutRegionRef = {
  rootId: { value: "story" }, regionId: { value: "paragraph" }, kind: "footer"
};

describe("retained region identity", () => {
  it("distinguishes repeated page occurrences while preserving their shared logical source", () => {
    const first = { ...source, visualInstanceId: "page:1:story" };
    const second = { ...source, visualInstanceId: "page:2:story" };
    expect(matchesQuireLogicalRegion(first, second)).toBe(true);
    expect(matchesQuireRegionOccurrence(first, second)).toBe(false);
    expect(matchesQuireLogicalRegion(source, first)).toBe(true);
    expect(matchesQuireRegionOccurrence(source, first)).toBe(false);
    expect(matchesQuireRegionOccurrence(first, { ...first })).toBe(true);
    expect(matchesQuireRegionOccurrence(source, { ...source })).toBe(true);
  });

  it.each([
    { rootId: { value: "another-story" } },
    { regionId: { value: "another-paragraph" } }
  ])("keeps unrelated logical owners distinct: %j", change => {
    expect(matchesQuireLogicalRegion(source, { ...source, ...change })).toBe(false);
    expect(matchesQuireRegionOccurrence(source, { ...source, ...change })).toBe(false);
  });
});
