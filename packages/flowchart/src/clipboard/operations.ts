import { readFlowchart } from "../model/document";
import { instantiateFlowchart } from "../model/create";
import { assertFlowchartUnlocked, objectMembers } from "../objects/selection";
import type { FlowchartDocument, FlowchartPoint, FlowchartTerminal } from "../model/types";
import { flowchartFragmentBounds, flowchartTerminalPoint } from "./geometry";

/** @param document - Whole canonical graph. @param ids - Explicit nodes/edges to copy. @returns Detached graph with complete children and valid endpoints. */
export function copyFlowchartSelection(document: FlowchartDocument, ids: readonly string[]): FlowchartDocument {
  document=readFlowchart(document);
  const members=objectMembers(document,ids), byId=new Map(document.nodes.map(n=>[n.id,n]));
  const nodes=document.nodes.filter(n=>members.has(n.id)).map(n=>{if(!n.parent||members.has(n.parent))return n;const {parent:_parent,...root}=n;return root;});
  /** @param end - Source endpoint. @returns Retained reference or detached world-space point. */
  function detach(end: FlowchartTerminal): FlowchartTerminal {return "node" in end&&!members.has(end.node)?flowchartTerminalPoint(end,byId):end;}
  const edges=document.edges.filter(e=>members.has(e.id)).map(e=>({...e,source:detach(e.source),target:detach(e.target)}));
  if(!nodes.length&&!edges.length)throw new Error("请选择需要复制的图形或连线");
  return readFlowchart({...document,revision:0,nodes,edges});
}
/** @param document - Source before cutting. @param ids - Captured selection. @returns Removal validated before anything is written or deleted. */
export function removeFlowchartSelection(document: FlowchartDocument, ids: readonly string[]): FlowchartDocument {
  document=readFlowchart(document);const members=objectMembers(document,ids);
  for(const e of document.edges) if(("node" in e.source&&members.has(e.source.node))||("node" in e.target&&members.has(e.target.node)))members.add(e.id);
  assertFlowchartUnlocked(document,[...members]);
  return readFlowchart({...document,nodes:document.nodes.filter(n=>!members.has(n.id)),edges:document.edges.filter(e=>!members.has(e.id))});
}
/** @param fragment - Valid clipboard/component content. @param prefix - Fresh identity scope. @param point - Target top-left in world coordinates. @returns Independent identities and translated geometry without old host revision. */
export function placeFlowchartFragment(fragment: FlowchartDocument, prefix: string, point: FlowchartPoint): FlowchartDocument {
  const source=instantiateFlowchart(fragment,prefix), bounds=flowchartFragmentBounds(source), dx=point.x-bounds.x,dy=point.y-bounds.y;
  /** @param p - World-space point. @returns Translated world-space point. */
  function move(p: FlowchartPoint): FlowchartPoint {return {x:p.x+dx,y:p.y+dy};}
  /** @param end - Reference or free point. @returns Preserved identity or translated free point. */
  function terminal(end:FlowchartTerminal):FlowchartTerminal{return "node" in end?end:move(end);}
  return readFlowchart({...source,nodes:source.nodes.map(n=>({...n,...move(n)})),edges:source.edges.map(e=>({...e,source:terminal(e.source),target:terminal(e.target),vertices:e.vertices.map(move)}))});
}
