import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../../model/create";
import { readFlowchart } from "../../model/document";
import { addSwimlane, removeSwimlane, reorderSwimlane, equalizeSwimlanes, addSwimlanePhase } from "./index";

/** @param vertical - Lane direction. @returns Two lanes with content and an attached cross-lane edge. */
function fixture(vertical = false) {
  const pool = createFlowchartNode("pool", "container", { x: 0, y: 0 }, "审批池");
  const shape = vertical ? "lane-vertical" : "lane-horizontal";
  const a = { ...createFlowchartNode("a", shape, { x: 30, y: 70 }, "申请"), parent: "pool", width: vertical ? 220 : 700, height: vertical ? 500 : 180 };
  const b = { ...a, id: "b", x: vertical ? 250 : 30, y: vertical ? 70 : 250, text: "审批" };
  const node = { ...createFlowchartNode("task", "process", { x: a.x + 110, y: a.y + 65 }, "提交"), width: 90, parent: "a" };
  const other = { ...node, id: "other", x: b.x + 110, y: b.y + 65, parent: "b" };
  return readFlowchart({ ...createFlowchart(), nodes: [pool, a, b, node, other], edges: [{ id: "edge", source: { node: "task" }, target: { node: "other" }, routing: "orthogonal", vertices: [{ x: 500, y: 200 }], label: "", labelPosition: 0.5, style: {} }] });
}
it.each([false, true])("inserts and reorders owned lanes without double-moving descendants (%s)", vertical => {
  const source = fixture(vertical), next = addSwimlane(source, "new", "a"), axis = vertical ? "x" : "y";
  const inserted = next.nodes.find(n => n.id === "new")!, oldB = source.nodes.find(n => n.id === "b")!;
  expect(inserted[axis]).toBe(oldB[axis]);
  const moved = reorderSwimlane(source, "b", -1), before = source.nodes.find(n => n.id === "other")!;
  expect(moved.nodes.find(n => n.id === "b")![axis]).toBe(source.nodes.find(n => n.id === "a")![axis]);
  expect(moved.nodes.find(n => n.id === "other")![axis] - before[axis]).toBe(vertical ? -220 : -180);
  expect(moved.edges[0]?.vertices).toEqual(source.edges[0]?.vertices);
});
it("deletes the selected lane subtree and dangling edges; equal sizing protects member bounds", () => {
  const source = fixture(), removed = removeSwimlane(source, "a");
  expect(removed.nodes.map(n => n.id)).toEqual(["pool", "b", "other"]); expect(removed.edges).toHaveLength(0);
  expect(removed.nodes.find(n => n.id === "b")?.y).toBe(70);
  const wide = { ...source, nodes: source.nodes.map(n => n.id === "other" ? { ...n, x: 900 } : n) };
  const next = equalizeSwimlanes(wide, "a"), lanes = next.nodes.filter(n => n.shape === "lane-horizontal");
  expect(lanes[0]?.width).toBe(lanes[1]?.width); expect(lanes[1]!.x + lanes[1]!.width).toBeGreaterThan(990);
});
it("phase separators follow the full lane group after adding a lane and remain source-bound", () => {
  const source = addSwimlanePhase(fixture(), "phase", "a");
  expect(source.nodes.at(-1)).toMatchObject({ shape: "phase-vertical", parent: "pool" });
  const next = addSwimlane(source, "new", "b"), phase = next.nodes.find(n => n.id === "phase")!;
  expect(phase.height).toBeGreaterThan(source.nodes.at(-1)!.height);
  expect(readFlowchart(JSON.parse(JSON.stringify(next)))).toEqual(next);
});
