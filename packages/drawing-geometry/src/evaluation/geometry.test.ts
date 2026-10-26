import { describe, expect, it } from "vitest";
import { drawingPresetNames, resolveDrawingPreset, resolveDrawingAdjustmentHandles, isDrawingPreset, isLineDrawingPreset, isOpenDrawingPreset, readDrawingAdjustments } from "../index";

describe("standard preset geometry", () => {
  it.each(drawingPresetNames.filter(isLineDrawingPreset))('%s resolves horizontal and vertical zero-axis lines in finite path coordinates', preset => {
    for (const [width, height] of [[603, 0], [0, 603]]) {
      const geometry = resolveDrawingPreset(preset, width!, height!);
      expect(JSON.stringify(geometry)).not.toMatch(/null|NaN|Infinity/);
      expect(geometry.paths.every(path => path.width > 0 && path.height > 0)).toBe(true);
      expect(Object.values(geometry.textRect).every(Number.isFinite)).toBe(true);
      for (const handle of resolveDrawingAdjustmentHandles(preset, width!, height!)) {
        if (width === 0) expect(handle.position.x).toBe(0);
        if (height === 0) expect(handle.position.y).toBe(0);
      }
    }
  });
  it('rejects collapsed area shapes and empty or invalid line extents', () => {
    expect(() => resolveDrawingPreset('rect', 20, 0)).toThrow();
    expect(() => resolveDrawingPreset('line', 0, 0)).toThrow();
    expect(() => resolveDrawingPreset('line', -1, 20)).toThrow();
  });
  it("classifies zero-area lines independently of the standard fill default", () => {
    expect(isOpenDrawingPreset("line")).toBe(true);
    expect(isOpenDrawingPreset("lineInv")).toBe(true);
    expect(isOpenDrawingPreset("bentConnector3")).toBe(true);
    expect(isOpenDrawingPreset("rect")).toBe(false);
  });
  it("covers the complete standard name domain and rejects arbitrary names", () => {
    expect(drawingPresetNames).toHaveLength(187);
    expect(new Set(drawingPresetNames).size).toBe(187);
    expect(isDrawingPreset("star5")).toBe(true);
    expect(isDrawingPreset("constructor")).toBe(false);
    expect(isDrawingPreset("not-a-preset")).toBe(false);
  });
  it.each(drawingPresetNames)("%s resolves at wide, tall and square extents", preset => {
    for (const [width, height] of [[160, 96], [40, 240], [64, 64]]) {
      const geometry = resolveDrawingPreset(preset, width!, height!);
      expect(geometry.paths.length).toBeGreaterThan(0);
      expect(geometry.paths.every(path => path.segments.length > 0)).toBe(true);
      const numbers = JSON.stringify(geometry);
      expect(numbers).not.toMatch(/null|NaN|Infinity/);
      expect(Object.values(geometry.textRect).every(Number.isFinite)).toBe(true);
    }
  });
  it("keeps named adjustments and rejects unknown names and non-finite values", () => {
    expect(readDrawingAdjustments("star5", { adj: 28000, hf: 105146 })).toEqual({ adj: 28000, hf: 105146 });
    expect(readDrawingAdjustments("star5", { fake: 1 })).toBeUndefined();
    expect(readDrawingAdjustments("roundRect", { adj: Infinity })).toBeUndefined();
    expect(resolveDrawingPreset("roundRect", 200, 100, { adj: 0 }).textRect).toEqual({ left: 0, top: 0, right: 1, bottom: 1 });
  });
  it("preserves ellipse endpoints, curved holes and independent tonal paths", () => {
    const ellipse = resolveDrawingPreset("ellipse", 200, 100);
    expect(ellipse.paths[0]!.segments[0]).toEqual({ kind: "move-to", point: { x: 0, y: 50 } });
    const curves = ellipse.paths[0]!.segments.filter(segment => segment.kind === "bezier-curve-to");
    expect(curves).toHaveLength(4);
    expect(curves.at(-1)!.point.x).toBeCloseTo(0);
    expect(curves.at(-1)!.point.y).toBeCloseTo(50);
    expect(resolveDrawingPreset("donut", 100, 100).paths[0]!.segments.filter(segment => segment.kind === "move-to")).toHaveLength(2);
    expect(resolveDrawingPreset("cube", 160, 96).paths.some(path => path.fillMode === "darkenLess")).toBe(true);
  });
});
