import { describe, expect, it } from "vitest";
import {
  resolveQuireImePreeditInputProxyMinWidth,
  resolveQuireInputProxyPlacement
} from "./proxy";

describe("canvas input proxy placement", () => {
  it("maps caret geometry through the active surface client rectangle", () => {
    expect(
      resolveQuireInputProxyPlacement({
        anchor: { x: 40, y: 108, width: 2, height: 24 },
        surfaceBounds: { x: 0, y: 0, width: 840, height: 360 },
        surfaceClientRect: { left: 120, top: 520, width: 420, height: 180 },
        positioningRootClientRect: { left: 100, top: 480, width: 460, height: 220 }
      })
    ).toEqual({
      left: 40,
      top: 94,
      width: 150,
      height: 20
    });
  });

  it("converts client offsets into a zoomed root's local CSS pixels", () => {
    // The root and surface share a 0.5 host zoom, so client deltas are halved.
    expect(
      resolveQuireInputProxyPlacement({
        anchor: { x: 40, y: 100, width: 2, height: 24 },
        surfaceBounds: { x: 0, y: 0, width: 800, height: 400 },
        surfaceClientRect: { left: 100, top: 200, width: 400, height: 200 },
        positioningRootClientRect: { left: 100, top: 200, width: 400, height: 200 },
        positioningRootScale: 0.5
      })
    ).toEqual({
      left: 40,
      top: 100,
      width: 150,
      height: 24
    });
  });

  it("falls back to scale one when logical bounds collapse", () => {
    expect(
      resolveQuireInputProxyPlacement({
        anchor: { x: 10, y: 20, width: 0, height: 0 },
        surfaceBounds: { x: 0, y: 0, width: 0, height: 0 },
        surfaceClientRect: { left: 100, top: 200, width: 300, height: 100 },
        positioningRootClientRect: { left: 80, top: 160, width: 320, height: 140 },
        minWidth: 4,
        minHeight: 18
      })
    ).toEqual({
      left: 30,
      top: 60,
      width: 4,
      height: 18
    });
  });

  it("keeps an IME-safe default width and expands for long preedit text", () => {
    expect(resolveQuireImePreeditInputProxyMinWidth("")).toBe(150);
    expect(resolveQuireImePreeditInputProxyMinWidth("你好")).toBe(150);
    expect(resolveQuireImePreeditInputProxyMinWidth("发大水发大水发大水发大水")).toBeGreaterThan(
      150
    );
  });
});
