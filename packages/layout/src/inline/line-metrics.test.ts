import { describe, expect, it, vi } from "vitest";
import { measureInlineNaturalLineMetrics } from "./line-metrics";

describe("natural per-run spacing metrics", () => {
  it("includes actual CJK fallback and normal font leading", () => {
    const measure = vi.fn((text: string) => text === "聘"
      ? { width: 16, ascent: 15, descent: 5, lineHeight: 24 }
      : { width: 8, ascent: 12, descent: 4, lineHeight: 18 });
    expect(measureInlineNaturalLineMetrics({ text: "A聘用", font: "16px fallback",
      marks: [], range: { from: 1, to: 4 } }, measure))
      .toEqual({ width: 0, ascent: 15, descent: 5, lineHeight: 24 });
    expect(measure.mock.calls.map(([text]) => text)).toEqual(["Hg", "聘"]);
  });

  it("falls back to exact font-size extent without a host vertical capability", () => {
    const metrics = measureInlineNaturalLineMetrics({ text: "A", font: "14px Arial",
      marks: [], range: { from: 1, to: 2 } }, () => ({ width: 8 }));
    expect(metrics.ascent! + metrics.descent!).toBe(14);
    expect(metrics.lineHeight).toBe(14);
  });
});
