import { describe, expect, it } from "vitest";
import { boundedPan, clampMindMapZoom, wheelPixels } from "./math";

describe("device-independent viewport input", () => {
  it("keeps tiny deltas continuous across the old trackpad threshold", () => {
    expect(wheelPixels(10, 0, 800)).toBe(10);
    expect(wheelPixels(11, 0, 800)).toBe(11);
    expect(wheelPixels(20, 0, 800) * 0.45).toBe(9);
  });
  it("normalizes line and page units and caps inertial spikes", () => {
    expect(wheelPixels(3, 1, 800)).toBe(48);
    expect(wheelPixels(-1, 2, 800)).toBe(-160);
    expect(wheelPixels(Number.NaN, 0, 800)).toBe(0);
    expect(Math.hypot(...boundedPan(300, 400))).toBe(96);
    expect(boundedPan(3, 4)).toEqual([3, 4]);
  });
  it("limits zoom and rejects values that would corrupt the transform", () => {
    expect(clampMindMapZoom(0)).toBe(0.1);
    expect(clampMindMapZoom(4)).toBe(3);
    expect(() => clampMindMapZoom(Number.NaN)).toThrow();
  });
});
