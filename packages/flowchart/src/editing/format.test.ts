import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { copyFlowchartFormat, applyFlowchartFormat } from "./format";
/** @returns Nodes with deliberately incompatible overrides and two connections. */
function sample() { const a = createFlowchartNode("a", "note", { x: 0, y: 0 }, "原文字"), b = createFlowchartNode("b", "process", { x: 300, y: 100 }, "目标文字"); return { ...createFlowchart(), nodes: [{ ...a, style: { fill: "#112233" } }, { ...b, style: { bold: true, fontSize: 28 } }], edges: [
  { id: "e", source: { node: "a" }, target: { node: "b" }, vertices: [], label: "来源", labelPosition: 0.5, routing: "straight" as const, connector: "smooth" as const, style: { stroke: "#ff0000", targetArrow: "open" as const } },
  { id: "f", source: { node: "b" }, target: { x: 600, y: 400 }, vertices: [{ x: 500, y: 200 }], label: "保留", labelPosition: 0.2, routing: "orthogonal" as const, crossing: "jump" as const, style: { dashed: true } },
] }; }
it("copies only canonical node style, clearing old overrides while retaining all content and geometry", () => {
  const before = sample(), format = copyFlowchartFormat(before, "a"), after = applyFlowchartFormat(before, ["b"], format);
  expect(after.nodes[1]).toEqual({ ...before.nodes[1], style: before.nodes[0]!.style }); expect(after.edges).toBe(before.edges);
  expect(Object.isFrozen(format.style)).toBe(true); expect(before.nodes[1]!.style).toHaveProperty("bold", true);
});
it("copies route appearance without changing terminals, bends or label placement", () => {
  const before = sample(), after = applyFlowchartFormat(before, ["f"], copyFlowchartFormat(before, "e"));
  const { crossing: _crossing, ...edge } = before.edges[1]!;
  expect(after.edges[1]).toEqual({ ...edge, routing: "straight", connector: "smooth", style: before.edges[0]!.style });
});
it("rejects incompatible mixtures, missing identities, locks and invalid formatting atomically", () => {
  const before = sample(), format = copyFlowchartFormat(before, "a");
  for (const ids of [[], ["a", "e"], ["missing"]]) expect(() => applyFlowchartFormat(before, ids, format)).toThrow();
  expect(() => copyFlowchartFormat(before, "missing")).toThrow();
  expect(() => applyFlowchartFormat({ ...before, nodes: before.nodes.map(n => ({ ...n, locked: true })) }, ["b"], format)).toThrow(/锁定/);
  expect(() => applyFlowchartFormat(before, ["b"], { kind: "node", style: { fill: "url(evil)" } })).toThrow();
});
it("does not create an edit for equivalent style", () => { const before = sample(); expect(applyFlowchartFormat(before, ["a"], copyFlowchartFormat(before, "a"))).toBe(before); });
