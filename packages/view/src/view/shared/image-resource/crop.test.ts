import { describe, expect, it } from "vitest";
import { resolveQuireImageSourceRect } from "./crop";

describe("image source crop projection", () => {
  it("projects negative source outsets without clamping destination intent", () => {
    expect(resolveQuireImageSourceRect(
      { top: -0.05, right: 0.1, bottom: 0, left: -0.02 },
      { width: 200, height: 100 }
    )).toEqual({
      x: -4,
      y: -5,
      width: 184,
      height: 105
    });
  });
});
