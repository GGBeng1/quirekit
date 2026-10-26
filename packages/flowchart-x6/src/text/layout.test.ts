import { expect, it } from "vitest";
import type { FlowchartNode } from "@quirekit/flowchart";
import { layoutCaption } from "./layout";
import type { CaptionMeasure } from "./types";
const theme = { primary: "#1266cc", surface: "#ffffff", text: "#222222", line: "#999999", fontFamily: "sans-serif" };
const measure: CaptionMeasure = (text, format) => [...text].length * format.fontSize * .5;
const node: FlowchartNode = { id: "n", shape: "rectangle", x: 0, y: 0, width: 200, height: 100, text: "Hello 世界😀", style: {} };
it("measures actual local overrides and honors safe caption alignment", () => {
  const runs = layoutCaption({ ...node, textSpans: [{ from: 0, to: 5, fontSize: 24, bold: true, link: "https://example.com" }] }, theme, measure);
  expect(runs).toHaveLength(2); expect(runs[0]!.format.fontSize).toBe(24); expect(runs[0]!.format.link).toBe("https://example.com");
  expect(runs[0]!.x).toBeLessThan(runs[1]!.x); expect(runs[0]!.y).toBe(runs[1]!.y);
});
it("wraps graphemes, retains safe emoji, and marks overflow without changing source", () => {
  const source = { ...node, width: 60, height: 45, text: "One two three 世界😀😀", textSpans: [{ from: 0, to: 3, bold: true }] };
  const runs = layoutCaption(source, theme, measure);
  expect(runs.at(-1)!.text).toBe("…"); expect(runs.every(run => Number.isFinite(run.x + run.y + run.width))).toBe(true);
  expect(source.text).toBe("One two three 世界😀😀");
});
it("shares italic posture with measurement and resolves explicit link underline overrides", () => {
  const inputs: boolean[] = [], runs = layoutCaption({ ...node, textSpans: [{ from: 0, to: 5, italic: true, underline: false, strike: true, link: "https://example.com" }] }, theme, (text, format) => { inputs.push(format.italic); return measure(text, format); });
  expect(inputs).toContain(true); expect(runs[0]!.format).toMatchObject({ italic: true, underline: false, strike: true });
  expect(runs[1]!.format).toMatchObject({ italic: false, underline: false, strike: false });
});
