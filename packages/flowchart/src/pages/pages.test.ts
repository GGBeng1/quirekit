import { describe, expect, it } from "vitest";
import { createFlowchart, readFlowchart, serializeFlowchart, parseFlowchart } from "../index";
import { defaultFlowchartPageSettings, readFlowchartPageSettings } from "./settings";
import { planFlowchartPages } from "./plan";

describe("portable physical pages", () => {
  it("retains explicit page settings without inventing defaults in older sources", () => {
    const empty = createFlowchart();
    expect(readFlowchart(empty)).not.toHaveProperty("page");
    const source = readFlowchart({ ...empty, page: { ...defaultFlowchartPageSettings, paper: "A3", orientation: "landscape", scale: 0.7 } });
    expect(parseFlowchart(serializeFlowchart(source))).toEqual(source);
    expect(Object.isFrozen(source.page?.margins)).toBe(true);
    expect(() => readFlowchart({ ...empty, page: { ...defaultFlowchartPageSettings, zoom: 2 } })).toThrow();
    for (const scale of [0, Infinity, NaN, 4.1, "1"]) expect(() => readFlowchartPageSettings({ ...defaultFlowchartPageSettings, scale })).toThrow();
    expect(() => readFlowchartPageSettings({ ...defaultFlowchartPageSettings, margins: { top: 0, right: -1, bottom: 0, left: 0 } })).toThrow();
  });
  it("centres negative-coordinate content on one physical sheet", () => {
    const plan = planFlowchartPages({ x: -700, y: -350, width: 1400, height: 700 }, defaultFlowchartPageSettings);
    expect(plan.pages).toHaveLength(1); expect(plan.scale).toBeCloseTo(190 * 96 / 25.4 / 1400);
    const page = plan.pages[0]!;
    expect(page.x + page.width / 2).toBeCloseTo(0); expect(page.y + page.height / 2).toBeCloseTo(0);
  });
  it("tiles exact boundaries without a blank extra page, in row-major order", () => {
    const w = 190 * 96 / 25.4, h = 277 * 96 / 25.4;
    const plan = planFlowchartPages({ x: -90, y: -30, width: w * 2, height: h * 2 }, { ...defaultFlowchartPageSettings, scale: 1 });
    expect(plan.pages).toHaveLength(4); expect([plan.rows, plan.columns]).toEqual([2, 2]);
    expect(plan.pages.map(page => [page.row, page.column])).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
    expect(plan.pages[1]!.x).toBeCloseTo(plan.pages[0]!.x + plan.pages[0]!.width);
    expect(plan.pages[2]!.y).toBeCloseTo(plan.pages[0]!.y + plan.pages[0]!.height);
    expect(planFlowchartPages({ x: 0, y: 0, width: w + 1, height: 1 }, { ...defaultFlowchartPageSettings, scale: 1 }).pages).toHaveLength(2);
  });
  it("swaps A3 axes, includes empty-source bounds, and rejects excessive output", () => {
    const plan = planFlowchartPages({ x: 0, y: 0, width: 1, height: 1 }, { ...defaultFlowchartPageSettings, paper: "A3", orientation: "landscape" });
    expect([plan.paperWidth, plan.paperHeight]).toEqual([420, 297]); expect(plan.pages).toHaveLength(1);
    expect(() => planFlowchartPages({ x: 0, y: 0, width: 4e6, height: 4e6 }, { ...defaultFlowchartPageSettings, scale: 4 })).toThrow("100");
    expect(() => planFlowchartPages({ x: 0, y: 0, width: 0, height: 1 }, defaultFlowchartPageSettings)).toThrow();
  });
});
