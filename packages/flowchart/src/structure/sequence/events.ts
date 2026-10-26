import { isSequenceParticipant } from "../hierarchy";
import type { FlowchartDocument, FlowchartNode, FlowchartTerminal } from "../../model/types";
import type { SequenceEvent, SequenceRow } from "./types";

/** @param end - Message endpoint. @param nodes - Valid identity index. @returns Participant through its activation, when this is a time-axis anchor. */
export function sequenceEndpoint(end:FlowchartTerminal,nodes:ReadonlyMap<string,FlowchartNode>):FlowchartNode|undefined{
  if(!("node"in end)||!end.anchor)return undefined;
  const node=nodes.get(end.node)!;
  const owner=node.shape==="activation"&&node.parent?nodes.get(node.parent):undefined;
  return isSequenceParticipant(node.shape)?node:owner&&isSequenceParticipant(owner.shape)?owner:undefined;
}
/** @param document - Canonical graph. @returns Messages with two valid same-diagram time-axis attachments. */
export function sequenceEvents(document:FlowchartDocument):SequenceEvent[]{
  const nodes=new Map(document.nodes.map(n=>[n.id,n])),events:SequenceEvent[]=[];
  for(const edge of document.edges){
    const from=sequenceEndpoint(edge.source,nodes),to=sequenceEndpoint(edge.target,nodes);
    if(!from||!to||from.parent!==to.parent||!("node"in edge.source)||!("node"in edge.target))continue;
    const source=nodes.get(edge.source.node)!,target=nodes.get(edge.target.node)!;
    const sourceY=source.y+source.height*edge.source.anchor!.y,targetY=target.y+target.height*edge.target.anchor!.y;
    events.push({edge,from,to,sourceY,targetY,y:Math.min(sourceY,targetY),duration:Math.abs(targetY-sourceY)});
  }
  return events;
}
/** @param events - One diagram's events. @returns Stable concurrent rows with the original gaps and enough room for self calls. */
export function sequenceRows(events:readonly SequenceEvent[]):SequenceRow[]{
  const grouped=new Map<number,SequenceEvent[]>();
  for(const event of events){const key=Math.round(event.y*1000)/1000;const row=grouped.get(key)??[];row.push(event);grouped.set(key,row);}
  const entries=[...grouped].sort(([a],[b])=>a-b);
  return entries.map(([y,events],i)=>({y,events,span:Math.max(48+Math.max(...events.map(e=>e.duration)),(entries[i+1]?.[0]??y)-y)}));
}
/** @param checkpoints - Ordered old/new slot starts, allowing collapsed deleted slots. @returns Monotonic projection for auxiliary geometry; before the first event stays unchanged. */
export function sequenceTimeMap(checkpoints:readonly (readonly [number,number])[]):(y:number)=>number{
  return (y:number):number=>{
    if(!checkpoints.length||y<checkpoints[0]![0])return y;
    let low=1,high=checkpoints.length;
    while(low<high){const middle=(low+high)>>>1;if(checkpoints[middle]![0]<=y)low=middle+1;else high=middle;}
    if(low<checkpoints.length){const a=checkpoints[low-1]!,b=checkpoints[low]!;return a[1]+(y-a[0])/(b[0]-a[0])*(b[1]-a[1]);}
    const last=checkpoints.at(-1)!;return y+last[1]-last[0];
  };
}
