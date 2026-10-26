import { describe, expect, it } from "vitest";
import { starPasteRegex } from "./bold";

describe("starPasteRegex", () => {
  it("matches a bold span even when an italic span follows it", () => {
    const matches = [..."a **bold** *italic*".matchAll(starPasteRegex)];
    expect(matches).toHaveLength(1);
    expect(matches[0]?.[2]).toBe("bold");
  });

  it("matches separated bold spans", () => {
    const matches = [..."**a**, **b**".matchAll(starPasteRegex)];
    expect(matches.map((m) => m[2])).toEqual(["a", "b"]);
  });
});
