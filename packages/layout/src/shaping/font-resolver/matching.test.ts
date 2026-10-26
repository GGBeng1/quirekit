import { describe, expect, it } from "vitest";
import type { QuireLoadedShaperFont } from "../types";
import { doesQuireFontFamilyMatch } from "./matching";

/**
 * Builds a minimal loaded font fixture for family-matching tests.
 *
 * @param family - Concrete CSS family name.
 * @param genericFamily - Optional generic family the font satisfies.
 * @returns Loaded shaper font with only the fields the matcher reads.
 */
function loadedFont(family: string, genericFamily?: string): QuireLoadedShaperFont {
  return {
    source: {
      id: family,
      family,
      data: new ArrayBuffer(0),
      ...(genericFamily === undefined ? {} : { genericFamily })
    }
  } as QuireLoadedShaperFont;
}

describe("doesQuireFontFamilyMatch", () => {
  it("matches a concrete family by normalized name", () => {
    expect(doesQuireFontFamilyMatch(loadedFont("DejaVu Sans Mono"), "DejaVu Sans Mono")).toBe(true);
    expect(doesQuireFontFamilyMatch(loadedFont("DejaVu Sans"), "DejaVu Sans Mono")).toBe(false);
  });

  it("resolves a generic family only to fonts of that generic category", () => {
    const mono = loadedFont("DejaVu Sans Mono", "monospace");
    const sans = loadedFont("DejaVu Sans", "sans-serif");

    expect(doesQuireFontFamilyMatch(mono, "monospace")).toBe(true);
    expect(doesQuireFontFamilyMatch(sans, "monospace")).toBe(false);
  });

  it("does not match a generic family for an untagged font", () => {
    expect(doesQuireFontFamilyMatch(loadedFont("DejaVu Sans"), "monospace")).toBe(false);
  });
});
