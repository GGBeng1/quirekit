import { describe, expect, it } from "vitest";
import { motionPoint, motionProgress } from "./geometry";

describe("cached choreography geometry", () => {
  it("respects delays and smooth easing independently of frame frequency", () => {
    const cue = { id: "edge", delay: 500, duration: 1000, easing: "ease-in-out" as const };
    expect(motionProgress(cue, 0, 2000)).toBe(0); expect(motionProgress(cue, .25, 2000)).toBe(0);
    expect(motionProgress(cue, .5, 2000)).toBe(.5); expect(motionProgress(cue, 1, 2000)).toBe(1);
    expect(motionProgress({ id: "edge", duration: 2000 }, .25, 2000)).toBe(.25);
  });
  it("interpolates negative world coordinates and exact endpoints without a vendor path read", () => {
    const points = [{ x: -100, y: -20 }, { x: 0, y: 40 }, { x: 100, y: 60 }];
    expect(motionPoint(points, 0)).toEqual(points[0]); expect(motionPoint(points, 1)).toEqual(points[2]);
    expect(motionPoint(points, .25)).toEqual({ x: -50, y: 10 }); expect(motionPoint(points, .75)).toEqual({ x: 50, y: 50 });
  });
});
