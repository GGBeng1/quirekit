import { describe, expect, it } from "vitest";
import { countPresetGalleryColumns, normalizePresetGalleryColumns } from "./geometry";

describe("preset gallery geometry", () => {
  it("projects visible auto-fit tracks into keyboard columns", () => {
    expect(countPresetGalleryColumns("128px 128px 128px")).toBe(3);
    expect(countPresetGalleryColumns("192.5px 192.5px 0px 0px")).toBe(2);
    expect(countPresetGalleryColumns("0px 0px")).toBe(1);
    expect(countPresetGalleryColumns("none")).toBe(1);
  });

  it("normalizes invalid host column constraints", () => {
    expect(normalizePresetGalleryColumns(3.8)).toBe(3);
    expect(normalizePresetGalleryColumns(0)).toBe(1);
    expect(normalizePresetGalleryColumns(-2)).toBe(1);
    expect(normalizePresetGalleryColumns(Number.NaN)).toBe(4);
    expect(normalizePresetGalleryColumns(Infinity)).toBe(4);
  });
});
