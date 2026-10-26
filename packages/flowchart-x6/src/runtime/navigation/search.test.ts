import { expect, it, vi } from "vitest";
import type { Graph } from "@antv/x6";
import { createFlowchartNode, type FlowchartNode } from "@quirekit/flowchart";
import { searchNodes, searchableNodeText, subscribeSearch } from "./search";
/** @param size - Independent graph scale. @returns Indexed event fixture with instrumented source enumeration. */
function fixture(size: number) {
  const listeners = new Map<string, Set<(event?: unknown) => void>>(); let batching = false;
  const nodes = Array.from({ length: size }, (_, i) => ({ id: String(i), source: createFlowchartNode(String(i), "process", { x: i, y: 0 }, `订单 Customer ${i}`),
    /** @returns Node identity. */ isNode: () => true,
    /** @returns Canonical data, instrumented separately from geometry. */ getData() { return { source: this.source }; } }));
  const enumerate = vi.fn(() => nodes);
  const graph = { getNodes: enumerate, model: { hasActiveBatch: () => batching },
    /** @param name - Event name. @param callback - Subscriber. */ on(name: string, callback: (event?: unknown) => void) { const entries = listeners.get(name) ?? new Set(); entries.add(callback); listeners.set(name, entries); },
    /** @param name - Event name. @param callback - Subscriber. */ off(name: string, callback: (event?: unknown) => void) { listeners.get(name)?.delete(callback); } } as unknown as Graph;
  return { graph, nodes, enumerate, listeners,
    /** @param value - Batch ownership. */ batch(value: boolean): void { batching = value; },
    /** @param name - Event name. @param event - Bounded event payload. */ emit(name: string, event?: unknown): void { listeners.get(name)?.forEach(callback => callback(event)); } };
}
it("finds literal display text and structured members with exact totals and bounded rows", () => {
  const f = fixture(220);
  expect(searchNodes(f.graph, "CUSTOMER", 12)).toMatchObject({ total: 220, items: Array.from({ length: 12 }, (_, i) => ({ id: String(i) })) });
  expect(searchNodes(f.graph, "订单").items).toHaveLength(50);
  expect(searchNodes(f.graph, ".*").total).toBe(0);
  f.enumerate.mockClear(); expect(searchNodes(f.graph, "  ")).toEqual({ total: 0, items: [] }); expect(f.enumerate).not.toHaveBeenCalled();
  expect(() => searchNodes(f.graph, "x", 201)).toThrow();
  const entity: FlowchartNode = { ...createFlowchartNode("er", "er-entity", { x: 0, y: 0 }, "Account"), entity: { fields: [{ name: "customer_id", type: "UUID", key: "primary" }] } };
  expect(searchableNodeText(entity)).toContain("customer_id UUID");
  const uml = { ...createFlowchartNode("uml", "uml-class", { x: 0, y: 0 }, "Order"), uml: { attributes: ["+ id: UUID"], operations: ["+ submit(): void"] } };
  expect(searchableNodeText(uml)).toContain("+ submit(): void");
});
for (const size of [100, 500, 1000]) it(`invalidates once per semantic batch, with no geometry-triggered enumeration among ${size} nodes`, () => {
  const f = fixture(size), listener = vi.fn(() => searchNodes(f.graph, "Customer")), stop = subscribeSearch(f.graph, listener);
  expect(f.enumerate).toHaveBeenCalledTimes(1); f.enumerate.mockClear();
  for (let i = 0; i < 5; i++) { f.emit("node:change:position", { cell: f.nodes[0] }); f.emit("translate"); f.emit("scale"); }
  f.nodes[0]!.source = { ...f.nodes[0]!.source, style: { fill: "#ffffff" } }; f.emit("node:change:data", { cell: f.nodes[0] });
  expect(listener).not.toHaveBeenCalled(); expect(f.enumerate).not.toHaveBeenCalled();
  f.batch(true);
  for (let i = 0; i < 3; i++) { f.nodes[i]!.source = { ...f.nodes[i]!.source, text: `Customer changed ${i}` }; f.emit("node:change:data", { cell: f.nodes[i] }); }
  expect(listener).not.toHaveBeenCalled(); f.batch(false); f.emit("batch:stop");
  expect(listener).toHaveBeenCalledTimes(1); expect(f.enumerate).toHaveBeenCalledTimes(1);
  f.emit("cell:removed", { cell: f.nodes[0] }); expect(listener).toHaveBeenCalledTimes(2);
  stop(); expect([...f.listeners.values()].every(set => !set.size)).toBe(true);
});
