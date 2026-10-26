import {number} from "../model/validation";
import type {FlowchartNode,FlowchartShape} from "../model/types";
import {canTransformFlowchartShape} from "./geometry";
/** @param value - Strict node record. @param shape - Already admitted semantic shape. @returns Optional source fields without adding defaults to old graphs. */
export function readFlowchartTransform(value:Record<string,unknown>,shape:FlowchartShape):Pick<FlowchartNode,"rotation"|"flipX"|"flipY">{
  const result:{rotation?:number;flipX?:boolean;flipY?:boolean}={};
  if(!["rotation","flipX","flipY"].some(key=>Object.hasOwn(value,key)))return result;
  if(!canTransformFlowchartShape(shape))throw new TypeError("结构图形不支持旋转或翻转");
  if(Object.hasOwn(value,"rotation")){result.rotation=number(value.rotation,0,360,"rotation");if(result.rotation===360)throw new RangeError("rotation: expected [0,360)");}
  for(const key of ["flipX","flipY"] as const)if(Object.hasOwn(value,key)){if(typeof value[key]!=="boolean")throw new TypeError(`${key}: expected boolean`);result[key]=value[key];}
  return result;
}
