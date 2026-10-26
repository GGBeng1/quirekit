import { describe, expect, it } from "vitest";
import { resolveDrawingCustomColorPlacement } from "./custom-color-position";

describe("drawing custom-color placement", () => {
  it("prefers the right side when the secondary surface fits", () => {
    expect(resolveDrawingCustomColorPlacement(
      { left: 300, right: 560, top: 80 },
      { width: 260, height: 240 },
      { width: 1200, height: 800 }
    )).toEqual({ side: "right", top: 0 });
  });

  it("flips left instead of covering presets near the right edge", () => {
    expect(resolveDrawingCustomColorPlacement(
      { left: 700, right: 960, top: 80 },
      { width: 260, height: 240 },
      { width: 1024, height: 800 }
    )).toEqual({ side: "left", top: 0 });
  });

  it("keeps a tall secondary surface inside the viewport", () => {
    expect(resolveDrawingCustomColorPlacement(
      { left: 300, right: 560, top: 620 },
      { width: 260, height: 240 },
      { width: 1200, height: 800 }
    )).toEqual({ side: "right", top: -68 });
  });
});
