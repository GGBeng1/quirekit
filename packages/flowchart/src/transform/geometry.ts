import type {FlowchartNode,FlowchartPoint,FlowchartShape} from "../model/types";
import {isFlowchartContainer,isSequenceParticipant} from "../structure/hierarchy";
/** @param shape - Semantic shape. @returns Whether local mirroring and centered rotation are admitted. */
export function canTransformFlowchartShape(shape:FlowchartShape):boolean{
  return !isFlowchartContainer(shape)&&!isSequenceParticipant(shape)&&!shape.startsWith("phase-")&&!["activation","destruction","er-entity","uml-class"].includes(shape);
}
/** @param node - World rectangle and optional transforms. @param point - Untransformed local CSS point. @returns World point after local mirror and clockwise centered rotation. */
export function flowchartNodePoint(node:FlowchartNode,point:FlowchartPoint):FlowchartPoint{
  const x=(node.flipX?node.width-point.x:point.x)-node.width/2,y=(node.flipY?node.height-point.y:point.y)-node.height/2;
  const angle=(node.rotation??0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  return {x:node.x+node.width/2+x*c-y*s,y:node.y+node.height/2+x*s+y*c};
}
/** @param node - Rotated local rectangle. @returns Conservative visual bounds in world coordinates. */
export function flowchartNodeBounds(node:FlowchartNode):{x:number;y:number;width:number;height:number}{
  const points=[{x:0,y:0},{x:node.width,y:0},{x:0,y:node.height},{x:node.width,y:node.height}].map(p=>flowchartNodePoint(node,p));
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
  return {x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
}
