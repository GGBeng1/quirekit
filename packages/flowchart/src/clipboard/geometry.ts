import { flowchartNodePoint, flowchartNodeBounds } from "../transform/geometry";
import type { FlowchartDocument, FlowchartNode, FlowchartPoint, FlowchartTerminal } from "../model/types";

/** @param end - Canonical attachment. @param nodes - Valid node index. @returns World-space port/anchor, or center for automatic outline attachment. */
export function flowchartTerminalPoint(end: FlowchartTerminal, nodes: ReadonlyMap<string,FlowchartNode>): FlowchartPoint {
  if (!("node" in end)) return end;
  const n=nodes.get(end.node)!;
  const p=end.anchor ?? (end.port === "top" ? {x:0.5,y:0} : end.port === "bottom" ? {x:0.5,y:1} : end.port === "left" ? {x:0,y:0.5} : end.port === "right" ? {x:1,y:0.5} : {x:0.5,y:0.5});
  return flowchartNodePoint(n,{x:n.width*p.x,y:n.height*p.y});
}
/** @param source - Nonempty detached graph. @returns World bounds including manual bends and free points. */
export function flowchartFragmentBounds(source: FlowchartDocument): { x:number; y:number; width:number; height:number } {
  const points: FlowchartPoint[]=source.nodes.flatMap(n=>{const b=flowchartNodeBounds(n);return [{x:b.x,y:b.y},{x:b.x+b.width,y:b.y+b.height}];});
  for (const e of source.edges) { points.push(...e.vertices); for(const p of [e.source,e.target]) if (!("node" in p)) points.push(p); }
  if (!points.length) throw new Error("请选择需要复制的图形或连线");
  let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
  for(const p of points){x=Math.min(x,p.x);y=Math.min(y,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);}
  return {x,y,width:right-x,height:bottom-y};
}
