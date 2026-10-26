import { describe, expect, it } from "vitest";
import {
  createQuireMountedSurfaceBounds,
  resolveQuireMountedViewportRect
} from "./geometry";

describe("resolveQuireMountedViewportRect", () => {
  it("prefers an explicit logical viewport", () => {
    const viewportRect = { x: 10, y: 20, width: 300, height: 400 };

    expect(resolveQuireMountedViewportRect({
      displaySize: { width: 800, height: 600 },
      viewportRect,
      viewportPadding: { left: 1, top: 2, right: 3, bottom: 4 }
    })).toBe(viewportRect);
  });

  it("derives a non-negative viewport from surface insets", () => {
    expect(resolveQuireMountedViewportRect({
      displaySize: { width: 40, height: 30 },
      viewportPadding: { left: 10, top: 8, right: 50, bottom: 40 }
    })).toEqual({ x: 10, y: 8, width: 0, height: 0 });
  });

  it("uses full surface bounds without viewport overrides", () => {
    expect(resolveQuireMountedViewportRect({
      displaySize: { width: 640, height: 480 }
    })).toEqual({ x: 0, y: 0, width: 640, height: 480 });
  });
});

describe("createQuireMountedSurfaceBounds", () => {
  it("roots measured dimensions at the surface origin", () => {
    expect(createQuireMountedSurfaceBounds({ width: 320, height: 200 })).toEqual({
      x: 0,
      y: 0,
      width: 320,
      height: 200
    });
  });
});
