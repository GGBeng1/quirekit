import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { readFlowchart, serializeFlowchart, parseFlowchart } from "../model/document";
import { groupFlowchart, ungroupFlowchart, orderFlowchart, lockFlowchart } from "./operations";

/** @returns Three sibling shapes with an internal bent connector. */
function fixture() {
  return { ...createFlowchart(), nodes: ["a", "b", "c"].map((id, i) => createFlowchartNode(id, "process", { x: i * 240, y: i * 40 }, id)),
    edges: [{ id: "e", source: { node: "a" }, target: { node: "b" }, vertices: [{ x: 200, y: 160 }], routing: "straight" as const, label: "", labelPosition: 0.5, style: {} }] };
}
it("groups nested ownership without changing geometry and ungroups to its original parent", () => {
  const before = fixture(), grouped = groupFlowchart(before, ["a", "b"], "g");
  expect(grouped.nodes.find(n => n.id === "a")).toEqual({ ...before.nodes[0], parent: "g" });
  expect(grouped.edges).toEqual(before.edges);
  const nested = groupFlowchart(grouped, ["g", "c"], "outer");
  const released = ungroupFlowchart(nested, ["g"]);
  expect(released.nodes.filter(n => ["a", "b", "c"].includes(n.id)).map(n => n.parent)).toEqual(["outer", "outer", "outer"]);
  const result = ungroupFlowchart(ungroupFlowchart(nested, ["outer"]), ["g"]);
  expect(result).toEqual(before);
});
it("persists locks strictly and rejects changes to locked members including inherited locks", () => {
  const source = lockFlowchart(groupFlowchart(fixture(), ["a", "b"], "g"), ["g", "e"], true);
  expect(parseFlowchart(serializeFlowchart(source))).toEqual(source);
  expect(() => groupFlowchart(source, ["g", "c"], "blocked")).toThrow(/锁定/);
  expect(() => ungroupFlowchart(source, ["g"])).toThrow(/锁定/);
  expect(() => orderFlowchart(source, ["a"], "front")).toThrow(/锁定/);
  expect(() => readFlowchart({ ...source, nodes: source.nodes.map(n => ({ ...n, locked: "yes" })) })).toThrow();
  expect(ungroupFlowchart(lockFlowchart(source, [], false, true), ["g"]).nodes).toEqual(fixture().nodes);
});
it("orders selected subtrees stably and moves one neighboring layer at a time", () => {
  const source = groupFlowchart(fixture(), ["a", "b"], "g");
  expect(orderFlowchart(source, ["g"], "front").nodes.map(n => n.id)).toEqual(["c", "a", "b", "g"]);
  expect(orderFlowchart(fixture(), ["a"], "forward").nodes.map(n => n.id)).toEqual(["b", "a", "c"]);
  expect(orderFlowchart(fixture(), ["b", "c"], "backward").nodes.map(n => n.id)).toEqual(["b", "c", "a"]);
  expect(orderFlowchart(fixture(), ["b"], "back").nodes.map(n => n.id)).toEqual(["b", "a", "c"]);
});
it("rejects structural, insufficient and cross-owner grouping atomically", () => {
  const source = groupFlowchart(fixture(), ["a", "b"], "g");
  expect(() => groupFlowchart(source, ["a", "c"], "other")).toThrow();
  expect(() => groupFlowchart(source, ["a"], "other")).toThrow();
  expect(() => groupFlowchart({ ...fixture(), nodes: fixture().nodes.map(n => ({ ...n, shape: "lifeline" as const })) }, ["a", "b"], "g")).toThrow();
});
