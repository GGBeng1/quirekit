import { describe, expect, it } from "vitest";
import { scrollDelta } from "./scroll";

const viewport = { top: 100, bottom: 500 };

describe("range scroll alignment", () => {
  it("leaves a visible target in place for nearest alignment", () => {
    expect(scrollDelta({ top: 200, bottom: 220 }, viewport)).toBe(0);
  });

  it("reveals the nearest edge of a target outside the viewport", () => {
    expect(scrollDelta({ top: 40, bottom: 60 }, viewport)).toBe(-60);
    expect(scrollDelta({ top: 600, bottom: 620 }, viewport)).toBe(120);
    expect(scrollDelta({ top: 600, bottom: 620 }, viewport, { margin: 10 })).toBe(130);
  });

  it("reveals the start of a target taller than the viewport", () => {
    expect(scrollDelta({ top: 150, bottom: 900 }, viewport)).toBe(50);
  });

  it("aligns to start, end and center on request", () => {
    const target = { top: 300, bottom: 320 };
    expect(scrollDelta(target, viewport, { block: "start", margin: 8 })).toBe(192);
    expect(scrollDelta(target, viewport, { block: "end" })).toBe(-180);
    expect(scrollDelta(target, viewport, { block: "center" })).toBe(10);
  });
});
