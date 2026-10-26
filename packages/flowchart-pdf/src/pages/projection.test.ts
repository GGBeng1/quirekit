import { expect, it } from "vitest";
import { planFlowchartPages, defaultFlowchartPageSettings } from "@quirekit/flowchart";
import { pdfPagePlacement } from "./projection";

it("projects negative world coordinates and physical margins with the same fixed-scale crops", () => {
  const bounds = { x: -500, y: -80, width: 1300, height: 800 }, plan = planFlowchartPages(bounds, { ...defaultFlowchartPageSettings, scale: 1 });
  const first = pdfPagePlacement(bounds, plan, 0), second = pdfPagePlacement(bounds, plan, 1);
  expect(first.width).toBe(975); expect(first.height).toBe(600);
  expect(first.x).toBeCloseTo(10 * 72 / 25.4);
  expect(first.x - second.x).toBeCloseTo((210 - 20) * 72 / 25.4);
  expect(first.y).toBeCloseTo(297 * 72 / 25.4 - 10 * 72 / 25.4 - 600);
});
