import { isSequenceFragment, isSequenceParticipant } from "../hierarchy";
import { fitSequenceContainers } from "../containers";
import type { FlowchartDocument, FlowchartNode, FlowchartTerminal } from "../../model/types";
import type { SequenceEvent } from "./types";

/** @param document - Source graph. @param reference - Selected event's participant scope. @param events - Retained/new events. @param positions - New row Y per event. @param time - Monotonic slot projection. @returns Reprojected geometry before final validation and permission checks. */
export function reflowSequence(document:FlowchartDocument,reference:SequenceEvent,events:readonly SequenceEvent[],positions:ReadonlyMap<string,number>,time:(y:number)=>number):FlowchartDocument{
  const original=new Map(document.nodes.map(n=>[n.id,n])),next=new Map(original),peers=document.nodes.filter(n=>isSequenceParticipant(n.shape)&&n.parent===reference.from.parent);
  const participantIds=new Set(peers.map(n=>n.id)),frames=new Set(document.nodes.filter(n=>isSequenceFragment(n.shape)&&n.parent===reference.from.parent).map(n=>n.id));
  const desired=new Map<string,number[]>();
  /** @param node - Attachment identity. @param y - Desired endpoint in world space. */
  function include(node:string,y:number):void{const points=desired.get(node)??[];points.push(y);desired.set(node,points);}
  for(const event of events){const delta=positions.get(event.edge.id)!-event.y;for(const [end,y]of [[event.edge.source,event.sourceY],[event.edge.target,event.targetY]] as const)if("node"in end)include(end.node,y+delta);}
  // Map intervals before normalized anchors. Activations keep their identity and
  // expand to include every still-attached event after a row permutation.
  for(const node of document.nodes){
    if(node.shape==="activation"&&node.parent&&participantIds.has(node.parent)){
      const attached=desired.get(node.id)??[],y=Math.min(time(node.y),...attached),bottom=Math.max(time(node.y+node.height),...attached);
      next.set(node.id,{...node,y,height:Math.max(20,bottom-y)});
    }else if(frames.has(node.id))next.set(node.id,{...node,y:time(node.y),height:Math.max(20,time(node.y+node.height)-time(node.y))});
    else if(node.parent&&frames.has(node.parent))next.set(node.id,{...node,y:time(node.y)});
  }
  const children=new Map<string,FlowchartNode[]>();
  for(const n of next.values())if(n.parent){const list=children.get(n.parent)??[];list.push(n);children.set(n.parent,list);}
  for(const peer of peers){
    const members=children.get(peer.id)??[],marker=members.find(n=>n.shape==="destruction");
    const attached=desired.get(peer.id)??[],barBottoms=members.filter(n=>n.shape==="activation").map(n=>n.y+n.height+24);
    const end=Math.max(peer.y+(peer.shape==="actor-lifeline"?336:168),...attached.map(y=>y+48),...barBottoms);
    const bottom=marker?Math.max(time(marker.y+marker.height/2),end):Math.max(time(peer.y+peer.height),end);
    next.set(peer.id,{...peer,height:bottom-peer.y});
    if(marker)next.set(marker.id,{...marker,y:bottom-marker.height/2});
  }
  /** @param end - Original attachment. @param worldY - Desired absolute Y. @returns Anchor normalized against the final owner geometry. */
  function anchor(end:FlowchartTerminal,worldY:number):FlowchartTerminal{
    if(!("node"in end)||!end.anchor)return end;
    const node=next.get(end.node)!;return {...end,anchor:{...end.anchor,y:(worldY-node.y)/node.height}};
  }
  const byEvent=new Map(events.map(e=>[e.edge.id,e])),existingIds=new Set(document.edges.map(e=>e.id));
  const scopeIds=new Set(document.edges.filter(e=>{
    if(!("node"in e.source)||!("node"in e.target))return false;
    const a=original.get(e.source.node)!,b=original.get(e.target.node)!;
    return (participantIds.has(a.id)||!!a.parent&&participantIds.has(a.parent))&&(participantIds.has(b.id)||!!b.parent&&participantIds.has(b.parent))&&!!e.source.anchor&&!!e.target.anchor;
  }).map(e=>e.id));
  const edges=[...document.edges.filter(e=>!scopeIds.has(e.id)||byEvent.has(e.id)),...events.filter(e=>!existingIds.has(e.edge.id)).map(e=>e.edge)].map(edge=>{
    const event=byEvent.get(edge.id);
    if(event){
      const dy=positions.get(edge.id)!-event.y;
      /** @param end - Existing attachment. @param y - Final event height. @param peer - Endpoint participant. @param other - Opposite participant. @returns A new request attaches to a covering activation instead of being hidden under it. */
      function messageAnchor(end:FlowchartTerminal,y:number,peer:FlowchartNode,other:FlowchartNode):FlowchartTerminal{
        const bar=!existingIds.has(edge.id)?(children.get(peer.id)??[]).find(n=>n.shape==="activation"&&n.y<=y&&n.y+n.height>=y):undefined;
        return bar?{node:bar.id,anchor:{x:other.x>=peer.x?1:0,y:(y-bar.y)/bar.height}}:anchor(end,y);
      }
      return {...edge,source:messageAnchor(edge.source,event.sourceY+dy,event.from,event.to),target:messageAnchor(edge.target,event.targetY+dy,event.to,event.from),vertices:edge.vertices.map(p=>({...p,y:p.y+dy}))};
    }
    // Other connectors retain their time attachment when a referenced lifeline
    // changes height; they do not participate in event ordering.
    /** @param end - Unrelated or partially attached connector. @returns Stable time projection only for changed owners. */
    function project(end:FlowchartTerminal):FlowchartTerminal{
      if(!("node"in end)||!end.anchor||next.get(end.node)===original.get(end.node))return end;
      const old=original.get(end.node)!;return anchor(end,time(old.y+old.height*end.anchor.y));
    }
    return {...edge,source:project(edge.source),target:project(edge.target)};
  });
  return fitSequenceContainers({...document,nodes:document.nodes.map(n=>next.get(n.id)!),edges},new Set([...participantIds,...frames]));
}
