import {readFlowchart} from "../model/document";
import {assertFlowchartUnlocked} from "../objects/selection";
import type {FlowchartDocument,FlowchartNode} from "../model/types";
import {canTransformFlowchartShape} from "./geometry";
import type {FlowchartTransform} from "./types";
/** @param document - Immutable source. @param ids - Explicit leaf selection. @param command - Visual transform. @returns One validated source change with preserved text and connections. */
export function transformFlowchart(document:FlowchartDocument,ids:readonly string[],command:FlowchartTransform):FlowchartDocument{
  document=readFlowchart(document);const selected=new Set(ids),targets=document.nodes.filter(n=>selected.has(n.id));
  if(!targets.length)throw new Error("请选择普通图形");
  if(targets.some(n=>!canTransformFlowchartShape(n.shape)))throw new Error("结构图形请使用专用编辑工具");
  const affected=document.edges.filter(e=>("node"in e.source&&selected.has(e.source.node))||("node"in e.target&&selected.has(e.target.node))).map(e=>e.id);
  assertFlowchartUnlocked(document,[...ids,...affected]);
  /** @param node - Selected ordinary node. @returns Minimal canonical optional transform fields. */
  function update(node:FlowchartNode):FlowchartNode{
    const {rotation:_rotation,flipX:_flipX,flipY:_flipY,...base}=node;let rotation=node.rotation??0,flipX=node.flipX??false,flipY=node.flipY??false;
    if(command==="rotate-left")rotation=(rotation+270)%360;
    else if(command==="rotate-right")rotation=(rotation+90)%360;
    else if(command==="flip-horizontal")flipX=!flipX;
    else if(command==="flip-vertical")flipY=!flipY;
    else if(command==="transform-reset")rotation=0,flipX=false,flipY=false;
    else throw new TypeError("未知图形变换");
    return {...base,...(rotation?{rotation}:{}),...(flipX?{flipX}:{}),...(flipY?{flipY}:{})};
  }
  return readFlowchart({...document,nodes:document.nodes.map(n=>selected.has(n.id)?update(n):n)});
}
