import { describe, expect, it } from "vitest";
import { drawingPresetNames } from "../presets/names";
import { resolveDrawingAdjustmentHandles } from "./resolve";
import { solveDrawingAdjustment } from "./solve";

describe("standard geometry control points", () => {
  it("retains all 243 declared handles across 120 presets", () => {
    const handles = drawingPresetNames.map(preset => resolveDrawingAdjustmentHandles(preset, 240, 140));
    expect(handles.filter(items => items.length > 0)).toHaveLength(120);
    expect(handles.flat()).toHaveLength(243);
    for (const handle of handles.flat()) {
      expect(Number.isFinite(handle.position.x) && Number.isFinite(handle.position.y)).toBe(true);
      for (const axis of [handle.x, handle.y, handle.radius, handle.angle].filter(Boolean)) {
        expect(Number.isFinite(axis!.min) && Number.isFinite(axis!.max)).toBe(true);
        expect(axis!.min).toBeLessThanOrEqual(axis!.max);
      }
    }
  });
  for (const preset of drawingPresetNames) {
    const handles = resolveDrawingAdjustmentHandles(preset, 240, 140);
    for (const handle of handles) it(`${preset} handle ${handle.index} follows an achievable nearby point`, () => {
      const target: Record<string, number> = {};
      for (const axis of [handle.x, handle.y, handle.radius, handle.angle].filter(Boolean)) {
        const bounded = Math.max(axis!.min, Math.min(axis!.max, axis!.value));
        const delta = Math.min(1000, (axis!.max - axis!.min) * 0.03);
        target[axis!.guide] = bounded + (bounded + delta <= axis!.max ? delta : -delta);
      }
      const point = resolveDrawingAdjustmentHandles(preset, 240, 140, target)[handle.index]!.position;
      const solved = solveDrawingAdjustment({ preset, width: 240, height: 140, adjustments: {}, handle: handle.index, point });
      const actual = resolveDrawingAdjustmentHandles(preset, 240, 140, solved)[handle.index]!.position;
      expect(Math.hypot(actual.x - point.x, actual.y - point.y)).toBeLessThan(0.15);
      expect(Object.keys(solved).every(key => Object.hasOwn(target, key))).toBe(true);
    });
  }
  it("clamps radius at its legal boundary and preserves unrelated values", () => {
    const result = solveDrawingAdjustment({ preset: "roundRect", width: 240, height: 140, adjustments: {}, handle: 0, point: { x: 1000, y: 0 } });
    expect(result.adj).toBe(50000);
  });
});

describe("adjustment gesture limits", () => {
  it("crosses the full-angle seam without sticking at zero", () => {
    const adjustments = { adj1: 300000, adj2: 16000000 };
    const point = resolveDrawingAdjustmentHandles("arc", 240, 140, { ...adjustments, adj1: 21300000 })[0]!.position;
    const result = solveDrawingAdjustment({ preset: "arc", width: 240, height: 140, adjustments, handle: 0, point });
    expect(result.adj1).toBeCloseTo(21300000, 1);
    expect(result.adj2).toBe(adjustments.adj2);
  });
  it("changes a connector bend and both coordinates of a callout outside its frame", () => {
    const bend = solveDrawingAdjustment({ preset: "bentConnector3", width: 240, height: 140, adjustments: {}, handle: 0, point: { x: 360, y: 70 } });
    expect(bend.adj1).toBeCloseTo(150000);
    const callout = solveDrawingAdjustment({ preset: "wedgeRectCallout", width: 240, height: 140, adjustments: {}, handle: 0, point: { x: -40, y: 200 } });
    const point = resolveDrawingAdjustmentHandles("wedgeRectCallout", 240, 140, callout)[0]!.position;
    expect(point.x).toBeCloseTo(-40, 2);
    expect(point.y).toBeCloseTo(200, 2);
  });
});
