import { describe, expect, it } from "vitest";
import { createChartSpec } from "../model/preset";
import type { ChartSpec } from "../model/types";
import { createChartSpecSignature } from "./signature";

describe("chart spec signature", () => {
  it("ignores key order and changes with revision, extent and data", () => {
    const spec = createChartSpec("column", "chart-a");
    const reordered = Object.fromEntries(Object.entries(spec).reverse()) as unknown as ChartSpec;
    const signature = createChartSpecSignature(spec);

    expect(signature).toMatch(/^chart-spec:v1:[0-9a-f]{16}$/);
    expect(createChartSpecSignature(reordered)).toBe(signature);
    expect(createChartSpecSignature({ ...spec, revision: spec.revision + 1 })).not.toBe(signature);
    expect(createChartSpecSignature({ ...spec, extent: { ...spec.extent, width: spec.extent.width + 1 } })).not.toBe(signature);
    expect(createChartSpecSignature({ ...spec, presentation: { ...spec.presentation, title: "Other" } })).not.toBe(signature);
  });
});
