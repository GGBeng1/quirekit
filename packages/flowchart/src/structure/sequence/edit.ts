import { readFlowchart } from "../../model/document";
import type { FlowchartDocument } from "../../model/types";
import { assertFlowchartUnlocked } from "../../objects/selection";
import { sequenceEvents, sequenceRows, sequenceTimeMap } from "./events";
import { reflowSequence } from "./reflow";
import type { SequenceEdit, SequenceEvent, SequenceRow } from "./types";

/** @param document - Canonical graph. @param edgeId - Selected sequence message. @param command - Row edit intent. @param freshId - Required identity for an inserted request. @returns One validated atomic timeline change, preserving source order and unrelated diagrams. */
export function editSequenceMessage(document:FlowchartDocument,edgeId:string,command:SequenceEdit,freshId?:string):FlowchartDocument{
  document=readFlowchart(document);const all=sequenceEvents(document),reference=all.find(e=>e.edge.id===edgeId);
  if(!reference)throw new Error("请选择一条连接生命线的时序消息");
  const events=all.filter(e=>e.from.parent===reference.from.parent),rows=sequenceRows(events),at=rows.findIndex(r=>r.events.includes(reference)),ordered=[...rows];
  const inserting=command==="sequence-insert-before"||command==="sequence-insert-after";
  if(inserting){
    if(!freshId)throw new Error("新消息缺少身份");
    const self=reference.from.id===reference.to.id,y=reference.y,duration=self?36:0;
    const inserted:SequenceEvent={...reference,y,sourceY:y,targetY:y+duration,duration,edge:{...reference.edge,id:freshId,label:"请求",source:{node:reference.from.id,anchor:{x:0.5,y:0}},target:{node:reference.to.id,anchor:{x:0.5,y:0}},
      vertices:self?[{x:reference.from.x+reference.from.width/2+90,y},{x:reference.from.x+reference.from.width/2+90,y:y+duration}]:[],style:{...reference.edge.style,dashed:false,sourceArrow:"none",targetArrow:"block"}}};
    ordered.splice(at+(command==="sequence-insert-after"?1:0),0,{y,span:duration+48,events:[inserted]});
  }else if(command==="sequence-remove-message"){
    const remaining=rows[at]!.events.filter(e=>e!==reference);if(remaining.length)ordered[at]={...rows[at]!,events:remaining};else ordered.splice(at,1);
  }else if(command==="sequence-move-up"||command==="sequence-move-down"){
    const other=at+(command==="sequence-move-up"?-1:1);if(other<0||other>=ordered.length)return document;
    [ordered[at],ordered[other]]=[ordered[other]!,ordered[at]!];
  }else throw new TypeError("未知时序消息操作");
  const positions=new Map<string,number>(),starts=new Map<SequenceRow,number>();let cursor=rows[0]!.y;
  for(const row of ordered){starts.set(row,cursor);for(const e of row.events)positions.set(e.edge.id,cursor);cursor+=row.span;}
  const reordering=command==="sequence-move-up"||command==="sequence-move-down";
  const checkpoints: [number,number][]=rows.map((r,i)=>[r.y,reordering?starts.get(ordered[i]!)!:positions.get(r.events.find(e=>positions.has(e.edge.id))?.edge.id??"")??(i?positions.get(rows[i-1]!.events[0]!.edge.id)!+rows[i-1]!.span:rows[0]!.y)]);
  checkpoints.push([rows.at(-1)!.y+rows.at(-1)!.span,cursor]);
  const after=reflowSequence(document,reference,ordered.flatMap(r=>r.events),positions,sequenceTimeMap(checkpoints));
  // Permission checks use the complete dependency diff, including expanded
  // ancestors and removed edges; a locked auxiliary object cannot be bypassed.
  const byId=new Map([...after.nodes,...after.edges].map(n=>[n.id,n]));
  const changed=[...document.nodes,...document.edges].filter(old=>JSON.stringify(old)!==JSON.stringify(byId.get(old.id))).map(n=>n.id);
  assertFlowchartUnlocked(document,changed);
  return readFlowchart(after);
}
