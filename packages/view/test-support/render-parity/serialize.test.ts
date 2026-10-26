import { describe, expect, it } from "vitest";
import { serializeQuireRenderParityFacts } from "./serialize";

describe("serializeQuireRenderParityFacts", () => {
  it("canonicalizes sub-pixel arithmetic noise", () => {
    const candidate = serializeQuireRenderParityFacts("layout", {
      x: 25_867.433_070_866_144
    });
    const reference = serializeQuireRenderParityFacts("layout", {
      x: 25_867.433_070_866_14
    });

    expect(candidate.value).toBe(reference.value);
  });

  it("preserves visible one-pixel geometry differences", () => {
    const candidate = serializeQuireRenderParityFacts("paint", { y: 1441.519 });
    const reference = serializeQuireRenderParityFacts("paint", { y: 1440.519 });

    expect(candidate.value).not.toBe(reference.value);
  });
});
