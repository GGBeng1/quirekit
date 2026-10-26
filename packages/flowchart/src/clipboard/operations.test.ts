import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../model/create";
import { copyFlowchartSelection, removeFlowchartSelection, placeFlowchartFragment } from "./operations";
import { serializeFlowchartClipboard, parseFlowchartClipboard } from "./format";
/** @returns Nested owner and connector with an external attachment. */
function fixture() {
  return {...createFlowchart(),nodes:[createFlowchartNode("g","container",{x:100,y:100},"架构"),{...createFlowchartNode("a","process",{x:140,y:160},"服务"),parent:"g"},createFlowchartNode("b","process",{x:1000,y:100},"外部")],
    edges:[{id:"e",source:{node:"a"},target:{node:"b",port:"left" as const},vertices:[{x:800,y:200}],routing:"straight" as const,label:"关联",labelPosition:0.5,style:{}}]};
}
it("copies descendants and freezes selected cross-boundary endpoints without orphan parents",()=>{
  const source=fixture(),part=copyFlowchartSelection(source,["g","e"]);
  expect(part.nodes.map(n=>n.id)).toEqual(["g","a"]); expect(part.edges[0]!.target).toEqual({x:1000,y:132});
  expect(copyFlowchartSelection(source,["a"]).nodes[0]!.parent).toBeUndefined(); expect(copyFlowchartSelection(source,["a"]).edges).toEqual([]);
});
it("remaps all references and translates free endpoints and bends together",()=>{
  const part=copyFlowchartSelection(fixture(),["g","b"]),placed=placeFlowchartFragment(part,"paste",{x:0,y:0});
  expect(placed.nodes[0]!.x).toBe(0); expect(placed.nodes[1]!.parent).toBe("paste-n0"); expect(placed.edges[0]!.source).toEqual({node:"paste-n1"});
  expect(placed.edges[0]!.vertices).toEqual([{x:700,y:100}]);
  const edge=placeFlowchartFragment(copyFlowchartSelection(fixture(),["e"]),"edge",{x:0,y:0}); expect(edge.nodes).toEqual([]); expect("node" in edge.edges[0]!.source).toBe(false);
});
it("uses bounded self-describing text and rejects foreign or malformed clipboard content",()=>{
  const part=copyFlowchartSelection(fixture(),["g"]);expect(parseFlowchartClipboard(serializeFlowchartClipboard(part))).toEqual(part);
  expect(()=>parseFlowchartClipboard("hello")).toThrow();expect(()=>parseFlowchartClipboard("quirekit-flowchart-selection:v1\n{}" )).toThrow();expect(()=>parseFlowchartClipboard("x".repeat(4000100))).toThrow();
});
it("cut removes descendants and incident edges atomically, rejecting locked dependencies",()=>{
  const source=fixture();expect(removeFlowchartSelection(source,["g"]).nodes.map(n=>n.id)).toEqual(["b"]);expect(removeFlowchartSelection(source,["g"]).edges).toEqual([]);
  expect(()=>removeFlowchartSelection({...source,nodes:source.nodes.map(n=>n.id==="a"?{...n,locked:true}:n)},["g"])).toThrow("锁定");
  expect(()=>removeFlowchartSelection({...source,edges:source.edges.map(e=>({...e,locked:true}))},["g"])).toThrow("锁定");
  expect(source.nodes).toHaveLength(3);
});
it("rejects empty or unknown selections before a system clipboard write",()=>{
  expect(()=>copyFlowchartSelection(fixture(),[])).toThrow();expect(()=>copyFlowchartSelection(fixture(),["absent"])).toThrow();
});
