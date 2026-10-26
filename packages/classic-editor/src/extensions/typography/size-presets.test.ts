import { describe, expect, it } from "vitest";
import {
  createClassicFontSizeCustomOption,
  createClassicFontSizeOptions,
  normalizeClassicFontSizeInput,
  resolveClassicFontSizeControlValue,
  resolveClassicFontSizeSelection
} from "./size-presets";

describe("Classic font-size product presets", () => {
  it("presents Chinese aliases before the complete Chinese Western list", () => {
    const options = createClassicFontSizeOptions("zh-CN");

    expect(options.slice(0, 16).map(({ label, points }) => [label, points]))
      .toEqual([
        ["初号", 42],
        ["小初", 36],
        ["一号", 26],
        ["小一", 24],
        ["二号", 22],
        ["小二", 18],
        ["三号", 16],
        ["小三", 15],
        ["四号", 14],
        ["小四", 12],
        ["五号", 10.5],
        ["小五", 9],
        ["六号", 7.5],
        ["小六", 6.5],
        ["七号", 5.5],
        ["八号", 5]
      ]);
    expect(options.slice(16).map(({ points }) => points)).toEqual([
      5, 5.5, 6.5, 7.5, 8, 9, 10, 10.5, 11, 12, 14, 15, 16, 18, 20, 22,
      24, 26, 28, 36, 42, 48, 72, 96
    ]);
  });

  it("uses the default Western list outside Simplified Chinese", () => {
    expect(createClassicFontSizeOptions("en").map(({ points }) => points))
      .toEqual([
        8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72, 96
      ]);
  });

  it("shows exact Chinese aliases without changing numeric canonical state", () => {
    expect(resolveClassicFontSizeControlValue("zh-CN", 12)).toBe("zh:12");
    expect(resolveClassicFontSizeControlValue("zh-CN", 13.25)).toBe(13.25);
    expect(resolveClassicFontSizeControlValue("en", 12)).toBe(12);
    expect(resolveClassicFontSizeControlValue("zh-CN", null)).toBeNull();
    expect(resolveClassicFontSizeSelection("zh:12")).toBe(12);
    expect(resolveClassicFontSizeSelection("zh:13")).toBeNull();
  });

  it("normalizes manual input to half-points and rejects invalid ranges", () => {
    expect(normalizeClassicFontSizeInput("13.7")).toBe(13.5);
    expect(normalizeClassicFontSizeInput("13.8")).toBe(14);
    expect(normalizeClassicFontSizeInput(".5")).toBeNull();
    expect(normalizeClassicFontSizeInput("1.24")).toBe(1);
    expect(normalizeClassicFontSizeInput("300")).toBe(300);
    expect(normalizeClassicFontSizeInput("0")).toBeNull();
    expect(normalizeClassicFontSizeInput("301")).toBeNull();
    expect(normalizeClassicFontSizeInput("12pt")).toBeNull();
    expect(normalizeClassicFontSizeInput("twelve")).toBeNull();
  });

  it("keeps custom option identities separate from preset identities", () => {
    const option = createClassicFontSizeCustomOption("13.7");

    expect(option).toEqual({ label: "13.7", value: "custom:13.7" });
    expect(resolveClassicFontSizeSelection(option.value)).toBe(13.5);
    expect(resolveClassicFontSizeSelection(15)).toBe(15);
    expect(resolveClassicFontSizeSelection(null)).toBeNull();
  });
});
