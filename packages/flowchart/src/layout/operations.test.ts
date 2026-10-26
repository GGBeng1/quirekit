import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { layoutFlowchart } from "./operations";
import type { FlowchartDocument } from "../model/types";

/** @returns Branch, merge and a return edge with intentionally scattered positions. */
function fixture(): FlowchartDocument {
  return { ...createFlowchart(), nodes: ["a", "b", "c", "d"].map((id, i) => ({ ...createFlowchartNode(id, "process", { x: i * 190, y: 450 - i * 90 }, id), width: 120, height: 60 })),
    edges: [["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"]].map(([a, b], i) => ({ id: `e${i}`, source: { node: a! }, target: { node: b! }, vertices: [], routing: "orthogonal", label: "", labelPosition: 0.5, style: {} })) };
}
it("lays out a branching flow deterministically in both directions without overlaps", () => {
  const source = fixture(), down = layoutFlowchart(source, [], "layout-down");
  const [a,b,c,d] = down.nodes;
  expect(a!.y + a!.height).toBeLessThan(b!.y); expect(b!.y).toBe(c!.y); expect(b!.y + b!.height).toBeLessThan(d!.y);
  expect(b!.x + b!.width).toBeLessThan(c!.x);
  expect(layoutFlowchart(down, [], "layout-down")).toEqual(down);
  const right = layoutFlowchart(source, [], "layout-right");
  expect(right.nodes[0]!.x + 120).toBeLessThan(right.nodes[1]!.x); expect(right.nodes[1]!.x).toBe(right.nodes[2]!.x);
  expect(down.edges).toEqual(source.edges); expect(source.nodes[0]!.y).toBe(450);
});
it("handles cycles, self loops and disconnected components without dropping edges", () => {
  const initial = fixture(); const source = { ...initial, edges: [...initial.edges, { ...initial.edges[0]!, id: "loop", source: {node:"d"}, target: {node:"a"} }, { ...initial.edges[0]!, id: "self", source: {node:"b"}, target: {node:"b"} }] };
  const result = layoutFlowchart(source, [], "layout-right"); expect(result.edges).toEqual(source.edges); expect(result.nodes.every(n => Number.isFinite(n.x))).toBe(true);
});
it("pins locks and leaves unselected obstacles and crossing bends unchanged", () => {
  const initial = fixture(), source = {...initial, nodes:initial.nodes.map(n => n.id === "b" ? {...n,locked:true} : n), edges:[{...initial.edges[0]!, vertices:[{x:510,y:700}]}]};
  const result = layoutFlowchart(source, ["a","b","c"], "layout-down");
  expect(result.nodes[1]).toEqual(source.nodes[1]); expect(result.nodes[3]).toEqual(source.nodes[3]); expect(result.edges[0]!.vertices).toEqual(source.edges[0]!.vertices);
  for (const n of [result.nodes[0]!, result.nodes[2]!]) for (const obstacle of [result.nodes[1]!,result.nodes[3]!]) expect(n.x + n.width <= obstacle.x || obstacle.x + obstacle.width <= n.x || n.y + n.height <= obstacle.y || obstacle.y + obstacle.height <= n.y).toBe(true);
});
it("moves nested containers as atomic roots and pins an owner with a locked child", () => {
  const source = fixture(), owner = {...createFlowchartNode("owner","container",{x:0,y:0},"系统"), width:800,height:600};
  const nested = {...source,nodes:[owner,...source.nodes.map(n => ({...n,parent:"owner"})),createFlowchartNode("other","process",{x:900,y:0},"外部")]};
  const result = layoutFlowchart(nested,[],"layout-down");
  expect(result.nodes[1]!.x - result.nodes[0]!.x).toBe(source.nodes[0]!.x); expect(result.nodes[1]!.y - result.nodes[0]!.y).toBe(source.nodes[0]!.y);
  const pinned = {...nested,nodes:nested.nodes.map(n => n.id === "b" ? {...n,locked:true} : n)};
  expect(layoutFlowchart(pinned,[],"layout-down").nodes[0]).toEqual(owner);
});
it("lays out one container's children and rejects lane overflow atomically", () => {
  const source=fixture(), owner={...createFlowchartNode("owner","container",{x:0,y:0},"系统"),width:900,height:900};
  const nested={...source,nodes:[owner,...source.nodes.map(n=>({...n,parent:"owner"}))]};
  const result=layoutFlowchart(nested,["owner"],"layout-down"); expect(result.nodes[2]!.y).toBe(result.nodes[3]!.y);
  const lane={...nested,nodes:[{...owner,shape:"lane-horizontal" as const,width:300,height:200},...nested.nodes.slice(1)]};
  expect(()=>layoutFlowchart(lane,["owner"],"layout-down")).toThrow("泳道空间不足");
});
it("rejects mixed ownership, sequence layouts and oversized synchronous operations", () => {
  expect(()=>layoutFlowchart({...createFlowchart(),nodes:[createFlowchartNode("l","lifeline",{x:0,y:0},"参与者")]},[],"layout-down")).toThrow("专用结构");
  expect(()=>layoutFlowchart({...createFlowchart(),nodes:Array.from({length:1001},(_,i)=>createFlowchartNode(`n${i}`,"process",{x:0,y:0},""))},[],"layout-down")).toThrow("1000");
});
it("keeps locked connector dependencies fixed", () => {
  const initial=fixture(), source={...initial,edges:initial.edges.map((e,i)=>i===0?{...e,locked:true}:e)};
  const after=layoutFlowchart(source,[],"layout-right"); expect(after.nodes[0]).toEqual(source.nodes[0]); expect(after.nodes[1]).toEqual(source.nodes[1]);
});
it("accepts the 1000-node layout budget with stable, separated positions", () => {
  const source={...createFlowchart(),nodes:Array.from({length:1000},(_,i)=>({...createFlowchartNode(`n${i}`,"process",{x:0,y:0},""),width:80,height:40}))};
  const after=layoutFlowchart(source,[],"layout-down"); expect(after.nodes).toHaveLength(1000);
  expect(after.nodes[999]!.x).toBe(999*128); expect(after.nodes[0]!.y).toBe(0);
});
