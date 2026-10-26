// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { defaultFlowchartPageSettings, planFlowchartPages, serializeFlowchart, createFlowchart, type FlowchartSnapshot } from "@quirekit/flowchart";
import { createFlowPrintDocument, flowPrintBounds, flowPrintPageSvg } from "./document";

const snapshot: FlowchartSnapshot = { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -90 1500 2100"><rect x="-30" y="-90" width="1500" height="2100" fill="#128844"/></svg>', source: serializeFlowchart(createFlowchart()), revision: 0, width: 1500, height: 2100 };
it("defines source once, creates physical crops, and escapes literal HTML titles", () => {
  const settings = { ...defaultFlowchartPageSettings, scale: 1 }, bounds = flowPrintBounds(snapshot, document), plan = planFlowchartPages(bounds, settings);
  const html = createFlowPrintDocument(snapshot, settings, document, '<script>alert("title")</script>');
  const tree = new DOMParser().parseFromString(html, "text/html");
  expect(tree.querySelectorAll(".qk-print-page")).toHaveLength(plan.pages.length);
  expect(tree.querySelectorAll("rect")).toHaveLength(1); expect(tree.querySelectorAll("use")).toHaveLength(plan.pages.length);
  expect(tree.querySelector("script")).toBeNull(); expect(tree.title).toContain("<script>");
  expect(html).toContain("size:210mm 297mm;margin:0"); expect(html).toContain(".qk-print-page:last-child{break-after:auto}");
  expect(flowPrintPageSvg(snapshot, plan, 1, document)).toContain(`viewBox="${plan.pages[1]!.x} ${plan.pages[1]!.y}`);
});
it("refuses executable XML and external resources before HTML serialization", () => {
  for (const content of ['<script>alert(1)</script>', '<image href="https://example.com/a.png"/>', '<rect onclick="alert(1)"/>', '<foreignObject><div>HTML</div></foreignObject>']) {
    expect(() => createFlowPrintDocument({ ...snapshot, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${content}</svg>` }, defaultFlowchartPageSettings, document, "图表")).toThrow();
  }
});
