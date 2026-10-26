import { expect, it } from "vitest";
import { createTheme } from "./create";

it("uses unitless ratios and preserves the reviewed size/line-box pairs", () => {
  const theme = createTheme();
  const heights = { display: 48, pageTitle: 36, sectionTitle: 28, heading: 24, body: 22, control: 22, compact: 21, helper: 20, code: 20 };
  for (const key of Object.keys(heights) as (keyof typeof heights)[]) {
    const role = theme.typography[key];
    expect(role.lineHeight).toMatch(/^\d+(?:\.\d+)?$/u);
    expect(Number(role.lineHeight) * Number.parseFloat(role.fontSize)).toBeCloseTo(heights[key], 2);
  }
  expect(theme.typography.body.lineHeight).toBe("1.5714");
  expect(Number(theme.typography.body.lineHeight) * 18).toBeCloseTo(28.2852, 4);
});
