import { describe, expect, it } from "vitest";
import { resolveQuireTextBaselineShift, resolveQuireTextMetricStyle } from "./metrics";

describe("neutral text metric styles", () => {
  it("resolves independent last valid values without scaling tracking or em shifts", () => {
    expect(resolveQuireTextMetricStyle([
      { horizontalScale: 0.8, letterSpacing: "1.5pt", baselineShiftEm: 0.3 },
      { horizontalScale: 2, letterSpacing: "-0.5px" },
      { letterSpacing: "normal", baselineShiftEm: Number.NaN, horizontalScale: 0 }
    ])).toEqual({ horizontalScale: 2, letterSpacing: -0.5, baselineShiftEm: 0.3 });
  });

  it("lets explicit defaults clear inherited adjustments", () => {
    const metrics = resolveQuireTextMetricStyle([
      { horizontalScale: 0.8, letterSpacing: "2pt", baselineShiftEm: 0.5 },
      { horizontalScale: 1, letterSpacing: "0px", baselineShiftEm: 0 }
    ]);
    expect(metrics).toEqual({ horizontalScale: 1, letterSpacing: 0, baselineShiftEm: 0 });
    expect(resolveQuireTextBaselineShift(metrics.baselineShiftEm, "20px Fixture")).toBeUndefined();
  });

  it("converts CSS point spacing and retains omitted properties", () => {
    expect(resolveQuireTextMetricStyle([{ letterSpacing: " 1.5pt " }]))
      .toEqual({ letterSpacing: 2 });
    expect(resolveQuireTextMetricStyle([])).toEqual({});
    expect(resolveQuireTextMetricStyle([
      { letterSpacing: "1em", horizontalScale: Number.POSITIVE_INFINITY, baselineShiftEm: Number.NEGATIVE_INFINITY },
      { horizontalScale: -1 }
    ])).toEqual({});
  });

  it("projects one em shift only after the actual run font is selected", () => {
    expect(resolveQuireTextBaselineShift(0.3, "20px Fixture")).toBe(6);
    expect(resolveQuireTextBaselineShift(0.3, "10px Fixture")).toBe(3);
    expect(resolveQuireTextBaselineShift(-0.25, "20px Fixture")).toBe(-5);
    expect(resolveQuireTextBaselineShift(undefined, "20px Fixture")).toBeUndefined();
    expect(resolveQuireTextBaselineShift(0.3, "unknown")).toBeUndefined();
  });
});
