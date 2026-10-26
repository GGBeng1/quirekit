import { describe, expect, it } from "vitest";
import { renderPhaseSummary } from "./operation-detail";

describe("renderPhaseSummary", () => {
  it("aggregates repeated phases and omits zero-duration noise", () => {
    const html = renderPhaseSummary([
      { name: "layout:block", startedAt: 0, endedAt: 4, durationMs: 4 },
      { name: "layout:block", startedAt: 4, endedAt: 10, durationMs: 6 },
      { name: "layout:zero", startedAt: 10, endedAt: 10, durationMs: 0 },
      { name: "render:paint", startedAt: 10, endedAt: 12, durationMs: 2 }
    ]);

    expect(html).toContain("layout:block 10.00ms x2");
    expect(html).toContain("render:paint 2.00ms");
    expect(html).not.toContain("layout:zero");
  });

  it("caps phase groups and reports hidden diagnostics", () => {
    const html = renderPhaseSummary([
      { name: "a", startedAt: 0, endedAt: 5, durationMs: 5 },
      { name: "b", startedAt: 5, endedAt: 9, durationMs: 4 },
      { name: "c", startedAt: 9, endedAt: 12, durationMs: 3 }
    ], 2);

    expect(html).toContain("a 5.00ms");
    expect(html).toContain("b 4.00ms");
    expect(html).toContain("+1 phase group hidden");
    expect(html).not.toContain("c 3.00ms");
  });

  it("normalizes non-positive and non-finite phase group limits", () => {
    const phases = [
      { name: "a", startedAt: 0, endedAt: 5, durationMs: 5 },
      { name: "b", startedAt: 5, endedAt: 9, durationMs: 4 }
    ];

    expect(renderPhaseSummary(phases, 0)).toBe("+2 phase groups hidden");
    expect(renderPhaseSummary(phases, -1)).toBe("+2 phase groups hidden");
    expect(renderPhaseSummary(phases, Number.NaN)).toBe(
      "+2 phase groups hidden"
    );
  });
});
