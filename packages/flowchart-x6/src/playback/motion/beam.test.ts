import { expect, it } from "vitest";
import { motionBeamPath, motionBeamSpan } from "./beam";

it("keeps a short local trail behind the head in both directions and bounds corner samples", () => {
  const points = [{ x: -100, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 100 }], span = motionBeamSpan(points);
  expect(span).toBe(.09);
  expect(motionBeamPath(points, .5, span, false)).toMatch(/^M-18,0/u);
  const reverseStart = motionBeamPath(points, .5, span, true).split(" ")[0]!.slice(1).split(",").map(Number);
  expect(reverseStart[0]).toBe(0); expect(reverseStart[1]).toBeCloseTo(18, 10);
  for (const progress of [0, .01, .49, .5, .99, 1]) {
    const path = motionBeamPath(points, progress, span, false);
    expect(path.split(" ")).toHaveLength(9); expect(path).not.toMatch(/NaN|Infinity/u); expect(path.endsWith("L0,0")).toBe(true);
  }
});
