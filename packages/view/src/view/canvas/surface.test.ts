import { describe, expect, it } from "vitest";
import {
  resolveCanvasSurfaceBackingSize,
  resolveCanvasSurfaceDisplaySize
} from "./surface";
import {
  defaultCanvasDevicePixelRatio,
  resolveCanvasDevicePixelRatio
} from "./device-pixel-ratio";

describe("Canvas 2D surface sizing", () => {
  it("uses at least a stable 2x default unless the host explicitly supplies a ratio", () => {
    expect(defaultCanvasDevicePixelRatio).toBe(2);
    expect(resolveCanvasDevicePixelRatio(undefined)).toBe(2);
    expect(resolveCanvasDevicePixelRatio(1)).toBe(1);
    expect(resolveCanvasDevicePixelRatio(undefined, () => 1)).toBe(2);
    expect(resolveCanvasDevicePixelRatio(undefined, () => 3)).toBe(3);
  });

  it("uses the displayed CSS rectangle before falling back to target size", () => {
    expect(
      resolveCanvasSurfaceDisplaySize({
        rect: { width: 640, height: 274 },
        fallback: { width: 840, height: 360 }
      })
    ).toEqual({ width: 640, height: 274 });
  });

  it("falls back when CSS layout has not produced a positive size", () => {
    expect(
      resolveCanvasSurfaceDisplaySize({
        rect: { width: 0, height: 0 },
        fallback: { width: 840, height: 360 }
      })
    ).toEqual({ width: 840, height: 360 });
  });

  it("locks backing pixels to displayed CSS size and device pixel ratio", () => {
    expect(
      resolveCanvasSurfaceBackingSize({
        displaySize: { width: 640, height: 274 },
        devicePixelRatio: 2
      })
    ).toEqual({ width: 1280, height: 548 });
  });

  it("falls back to viewport CSS pixels for invalid physical-pixel ratios", () => {
    expect(
      resolveCanvasSurfaceBackingSize({
        displaySize: { width: 640, height: 274 },
        devicePixelRatio: 0
      })
    ).toEqual({ width: 640, height: 274 });
  });
});
