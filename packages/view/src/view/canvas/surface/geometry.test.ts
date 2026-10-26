import { describe, expect, it } from "vitest";
import { resolveCanvasMountedSurfaceMetrics } from "./mounted";
import type { CanvasMountedViewElements } from "../types";

describe("zoomed Canvas surface geometry", () => {
  it("bounds automatic retina zoom without overriding a host density reader", () => {
    const coordinateSurface = {
      getBoundingClientRect: () => ({ width: 4000, height: 8000 }),
      ownerDocument: { defaultView: { devicePixelRatio: 3, getComputedStyle: () => ({ width: "1000px", height: "2000px" }) } }
    } as unknown as HTMLElement;
    const elements = { coordinateSurface } as CanvasMountedViewElements;
    expect(resolveCanvasMountedSurfaceMetrics({ elements }).devicePixelRatio).toBe(4);
    expect(resolveCanvasMountedSurfaceMetrics({ elements, runtime: { getDevicePixelRatio: () => 5 } }).devicePixelRatio).toBe(5);
  });
  it.each([1, 4])("preserves an explicit host backing scale at zoom %s", scale => {
    const coordinateSurface = {
      getBoundingClientRect: () => ({ width: 1000 * scale, height: 2000 * scale }),
      ownerDocument: { defaultView: { devicePixelRatio: 2, getComputedStyle: () => ({ width: "1000px", height: "2000px" }) } }
    } as unknown as HTMLElement;
    const metrics = resolveCanvasMountedSurfaceMetrics({
      elements: { coordinateSurface } as CanvasMountedViewElements, runtime: { devicePixelRatio: 1 }
    });
    expect(metrics.devicePixelRatio).toBe(1);
  });
  it.each([0.6, 4])("keeps document units at display scale %s", scale => {
    const coordinateSurface = {
      getBoundingClientRect: () => ({ width: 1000 * scale, height: 2000 * scale }),
      ownerDocument: { defaultView: { devicePixelRatio: 1, getComputedStyle: () => ({ width: "1000px", height: "2000px" }) } }
    } as unknown as HTMLElement;
    const metrics = resolveCanvasMountedSurfaceMetrics({ elements: { coordinateSurface } as CanvasMountedViewElements });
    expect(metrics.displaySize).toEqual({ width: 1000, height: 2000 });
    expect(metrics.surfaceBounds).toEqual({ x: 0, y: 0, width: 1000, height: 2000 });
    expect(metrics.devicePixelRatio).toBe(Math.max(2, scale));
  });
});
