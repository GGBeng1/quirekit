import { expect, it } from "vitest";
import { createFlowchart, createFlowchartNode } from "../../model/create";
import { addSequenceActivation, addSequenceDestruction, addSequenceParticipant } from "./participants";
import { addSequenceMessage } from "./messages";
import { addSequenceFragment } from "./frames";
import { editSequenceMessage } from "./edit";
import type { FlowchartDocument, FlowchartTerminal } from "../../model/types";
/** @returns Sequence containing an activation, three messages, a frame and a destruction marker. */
function fixture(){
  let s=addSequenceParticipant(addSequenceParticipant(createFlowchart(),"a"),"b");s=addSequenceActivation(s,"active","b");
  s=addSequenceMessage(s,"first",["a","b"],"request");s=addSequenceMessage(s,"second",["b"],"self");s=addSequenceMessage(s,"third",["a","b"],"reply");
  s=addSequenceFragment(s,"frame",["a","b"],"loop");return addSequenceDestruction(s,"dead","b");
}
/** @param source - Valid graph. @param end - Attached message end. @returns World-space event height. */
function y(source:FlowchartDocument,end:FlowchartTerminal):number{if(!("node"in end))return end.y;const n=source.nodes.find(n=>n.id===end.node)!;return n.y+n.height*end.anchor!.y;}
it("inserts a request in the middle, shifts later events and auxiliary geometry, preserving earlier events",()=>{
  const source=fixture(),after=editSequenceMessage(source,"second","sequence-insert-before","new");
  expect(after.edges).toHaveLength(4);expect(y(after,after.edges[0]!.source)).toBe(y(source,source.edges[0]!.source));
  expect(y(after,after.edges[1]!.source)).toBeGreaterThan(y(source,source.edges[1]!.source));
  const inserted=after.edges.find(e=>e.id==="new")!;expect(inserted.label).toBe("请求");expect(y(after,inserted.source)).toBe(y(source,source.edges[1]!.source));
  expect(after.nodes.find(n=>n.id==="dead")!.y).toBeGreaterThan(source.nodes.find(n=>n.id==="dead")!.y);
  expect(after.nodes.find(n=>n.id==="frame")!.height).toBeGreaterThan(source.nodes.find(n=>n.id==="frame")!.height);
  expect(after.nodes.filter(n=>n.shape==="lifeline").map(n=>n.x)).toEqual(source.nodes.filter(n=>n.shape==="lifeline").map(n=>n.x));
});
it("swaps message rows, retaining self-call duration and valid activation anchors",()=>{
  const source=fixture(),after=editSequenceMessage(source,"second","sequence-move-up");
  expect(y(after,after.edges[1]!.source)).toBeLessThan(y(after,after.edges[0]!.source));
  expect(y(after,after.edges[1]!.target)-y(after,after.edges[1]!.source)).toBeCloseTo(36);
  for(const e of after.edges)for(const end of [e.source,e.target])if("node"in end){expect(end.anchor!.y).toBeGreaterThanOrEqual(0);expect(end.anchor!.y).toBeLessThanOrEqual(1);}
  expect(after.edges[1]!.vertices[1]!.y-after.edges[1]!.vertices[0]!.y).toBe(36);
});
it("deletes a message and closes its event slot without removing participants",()=>{
  const source=fixture(),after=editSequenceMessage(source,"second","sequence-remove-message");
  expect(after.edges.map(e=>e.id)).toEqual(["first","third"]);expect(y(after,after.edges[1]!.source)).toBeLessThan(y(source,source.edges[2]!.source));expect(after.nodes).toHaveLength(source.nodes.length);
});
it("rejects locked dependent bars or messages atomically and leaves boundary moves unchanged",()=>{
  const source=fixture();expect(editSequenceMessage(source,"first","sequence-move-up")).toEqual(source);
  expect(()=>editSequenceMessage({...source,nodes:source.nodes.map(n=>n.id==="active"?{...n,locked:true}:n)},"first","sequence-insert-before","new")).toThrow("锁定");
  expect(()=>editSequenceMessage(source,"missing","sequence-move-down")).toThrow("时序消息");
});
it("keeps a different diagram unchanged and handles deletion of the last event",()=>{
  const initial=fixture();const other=addSequenceParticipant(createFlowchart(),"other");
  const separate={...other.nodes[0]!,parent:"other-diagram"},source={...initial,nodes:[...initial.nodes,createFlowchartNode("other-diagram","container",{x:2000,y:0},"其他时序"),separate]};
  const after=editSequenceMessage(source,"third","sequence-insert-after","added");expect(after.nodes.at(-1)).toEqual(separate);
  let one=addSequenceParticipant(addSequenceParticipant(createFlowchart(),"x"),"z");one=addSequenceMessage(one,"only",["x","z"],"request");
  const empty=editSequenceMessage(one,"only","sequence-remove-message");expect(empty.edges).toEqual([]);expect(empty.nodes).toHaveLength(2);
});
it("moves concurrent rows together while removing only the requested message",()=>{
  const initial=fixture(),source={...initial,edges:[...initial.edges,{...initial.edges[0]!,id:"concurrent"}]};
  const moved=editSequenceMessage(source,"first","sequence-move-down");
  expect(y(moved,moved.edges[0]!.source)).toBeCloseTo(y(moved,moved.edges.at(-1)!.source));
  const removed=editSequenceMessage(source,"first","sequence-remove-message");expect(removed.edges.some(e=>e.id==="concurrent")).toBe(true);expect(removed.edges).toHaveLength(3);
});
