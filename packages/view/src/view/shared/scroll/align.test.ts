import { describe, expect, it } from "vitest";
import { resolveMountedViewScrollMove } from "./align";

const bounds = { left: 0, right: 800, top: 100, bottom: 500 };
const below = { left: 10, right: 20, top: 900, bottom: 920 };

describe("scroll alignment", () => {
  it("aligns the target to the start, end or center with the margin", () => {
    expect(resolveMountedViewScrollMove(below, bounds, 0, 24, "start").y).toBe(900 - 124);
    expect(resolveMountedViewScrollMove(below, bounds, 0, 24, "end").y).toBe(920 - 476);
    expect(resolveMountedViewScrollMove(below, bounds, 0, 24, "center").y).toBe(910 - 300);
  });

  it("leaves a visible target in place only for nearest", () => {
    const visible = { left: 10, right: 20, top: 200, bottom: 220 };
    expect(resolveMountedViewScrollMove(visible, bounds, 0, 5, "nearest").y).toBe(0);
    expect(resolveMountedViewScrollMove(visible, bounds, 0, 5, "start").y).toBe(95);
    expect(resolveMountedViewScrollMove(below, bounds, 0, 5).y).toBe(920 - 500 + 5);
  });

  it("aligns the top of a target taller than the visible area", () => {
    const tall = { left: 10, right: 20, top: 900, bottom: 1400 };
    expect(resolveMountedViewScrollMove(tall, bounds, 0, 10, "center").y).toBe(900 - 110);
    expect(resolveMountedViewScrollMove(tall, bounds, 0, 10, "end").y).toBe(900 - 110);
  });
});
