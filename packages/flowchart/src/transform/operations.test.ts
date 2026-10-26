import {layoutFlowchart} from "../layout/operations";
import {arrangeFlowchart} from "../arrange/operations";
import {groupFlowchart} from "../objects/operations";
import {flowchartFragmentBounds} from "../clipboard/geometry";
import {expect,it} from "vitest";
import {createFlowchart,createFlowchartNode} from "../model/create";
import {readFlowchart,parseFlowchart,serializeFlowchart} from "../model/document";
import {transformFlowchart} from "./operations";
import {flowchartNodePoint,flowchartNodeBounds} from "./geometry";
it("persists bounded angles and independent flips, with old sources retaining their exact shape",()=>{
  const plain=createFlowchartNode("a","note",{x:100,y:200},"文字"),source={...createFlowchart(),nodes:[plain]};
  const rotated=transformFlowchart(source,["a"],"rotate-left");expect(rotated.nodes[0]!.rotation).toBe(270);
  const flipped=transformFlowchart(rotated,["a"],"flip-horizontal");expect(flipped.nodes[0]!.flipX).toBe(true);expect(parseFlowchart(serializeFlowchart(flipped))).toEqual(flipped);
  const reset=transformFlowchart(flipped,["a"],"transform-reset");expect(reset).toEqual(readFlowchart(source));
  expect(plain).not.toHaveProperty("rotation");
});
it("projects mirrored local points then clockwise rotation around the node center",()=>{
  const node={...createFlowchartNode("a","process",{x:100,y:200},""),width:160,height:80,rotation:90,flipX:true};
  const p=flowchartNodePoint(node,{x:0,y:40});expect(p.x).toBeCloseTo(180);expect(p.y).toBeCloseTo(320);
  const bounds=flowchartNodeBounds(node);expect(bounds.x).toBeCloseTo(140);expect(bounds.y).toBeCloseTo(160);expect(bounds.width).toBeCloseTo(80);expect(bounds.height).toBeCloseTo(160);
});
it("rejects malformed and structural transforms before mutating source",()=>{
  const node=createFlowchartNode("a","container",{x:0,y:0},"分层"),source={...createFlowchart(),nodes:[node]};
  expect(()=>transformFlowchart(source,["a"],"rotate-right")).toThrow("结构");
  for(const rotation of [-1,360,NaN,Infinity])expect(()=>readFlowchart({...createFlowchart(),nodes:[{...createFlowchartNode("b","process",{x:0,y:0},""),rotation}]})).toThrow();
  expect(()=>readFlowchart({...source,nodes:[{...node,flipX:true}]})).toThrow();
  expect(()=>readFlowchart({...createFlowchart(),nodes:[{...createFlowchartNode("b","process",{x:0,y:0},""),flipX:"yes"}]})).toThrow();
});
it("honors selected node and attached edge locks",()=>{
  const node=createFlowchartNode("a","note",{x:0,y:0},""),source={...createFlowchart(),nodes:[{...node,locked:true}]};
  expect(()=>transformFlowchart(source,["a"],"flip-vertical")).toThrow("锁定");
  expect(()=>transformFlowchart({...source,nodes:[node],edges:[{id:"e",locked:true,source:{node:"a"},target:{x:0,y:100},vertices:[],routing:"straight",label:"",labelPosition:0.5,style:{}}]},["a"],"rotate-right")).toThrow("锁定");
});

it("uses rotated visual bounds for arrangement, layout, grouping and fragment placement",()=>{
  const a={...createFlowchartNode("a","note",{x:100,y:200},""),width:200,height:60,rotation:90},b={...createFlowchartNode("b","process",{x:500,y:500},""),width:100,height:80};
  const source={...createFlowchart(),nodes:[a,b]};
  const aligned=arrangeFlowchart(source,["a","b"],"align-left").nodes.map(flowchartNodeBounds);
  expect(aligned[0]!.x).toBeCloseTo(aligned[1]!.x);
  const laid=layoutFlowchart(source,[],"layout-down").nodes.map(flowchartNodeBounds);
  expect(laid[0]!.x+laid[0]!.width).toBeLessThan(laid[1]!.x);
  const group=groupFlowchart(source,["a","b"],"g").nodes.at(-1)!;
  const bounds=flowchartFragmentBounds(source);expect(group.y).toBeCloseTo(bounds.y-8);expect(group.width).toBeCloseTo(bounds.width+16);
});
it("leaves the horizontal swimlane title clear when placing rotated children",()=>{
  const lane={...createFlowchartNode("lane","lane-horizontal",{x:0,y:0},"角色"),width:900,height:600};
  const child={...createFlowchartNode("a","process",{x:200,y:100},""),parent:"lane",rotation:45};
  const after=layoutFlowchart({...createFlowchart(),nodes:[lane,child]},["lane"],"layout-down");
  expect(flowchartNodeBounds(after.nodes[1]!).x).toBeGreaterThanOrEqual(128-1e-8);
});
