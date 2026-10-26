import { describe, expect, it } from "vitest";
import { resolveWordNumberingTab, resolveWordNumberingTabPosition } from "./tabs";
import type { WordParagraphTabStop } from "@quirekit/classic-paragraph-model";

/** @param value - Twip position. @param alignment - Tab kind. @returns One canonical tab. */
function stop(value: number, alignment: WordParagraphTabStop["alignment"] = "start"): WordParagraphTabStop {
  return { position: { unit: "dxa", value }, alignment };
}

describe("numbering suffix tabs", () => {
  it("distinguishes paragraph stops from fallback without changing their coordinates", () => {
    expect(resolveWordNumberingTab(360, [stop(360)], 240)).toEqual({ positionTwips: 360, source: "stop" });
    expect(resolveWordNumberingTab(361, [stop(360)], 240)).toEqual({ positionTwips: 720, source: "default-grid" });
    expect(resolveWordNumberingTab(100, [stop(360), stop(360, "clear"), stop(400, "bar")], 240, 600))
      .toEqual({ positionTwips: 600, source: "default-grid" });
    expect(resolveWordNumberingTab(100, [stop(360), stop(360, "clear"), stop(1440)], 240))
      .toEqual({ positionTwips: 1440, source: "stop" });
  });
  it("uses an explicit stop rather than a fixed gap or earlier default grid point", () => {
    expect(resolveWordNumberingTabPosition(300, [stop(1440)], 240)).toBe(1440);
    expect(resolveWordNumberingTabPosition(1440, [stop(1440)], 240)).toBe(1440);
    expect(resolveWordNumberingTabPosition(1441, [stop(1440)], 240)).toBe(2160);
  });
  it("respects same-position override, clear and bar stops", () => {
    expect(resolveWordNumberingTabPosition(100, [stop(360), stop(360, "clear"), stop(400, "bar"), stop(720, "clear")], 240)).toBe(1440);
    expect(resolveWordNumberingTabPosition(100, [stop(360, "clear"), stop(360)], 240)).toBe(360);
  });
  it("resolves character units once with the actual paragraph pitch", () => {
    expect(resolveWordNumberingTabPosition(200, [{ position: { unit: "character", value: 250 }, alignment: "start" }], 480)).toBe(1200);
  });
  it("uses imported document defaults after the final explicit stop", () => {
    expect(resolveWordNumberingTabPosition(1200, [stop(360)], 240, 600)).toBe(1800);
  });
});
