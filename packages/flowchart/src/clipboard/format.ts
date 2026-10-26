import { parseFlowchart, serializeFlowchart } from "../model/document";
import type { FlowchartDocument } from "../model/types";

/** Self-describing plain text travels between hosts without custom MIME support. */
export const flowchartClipboardPrefix="quirekit-flowchart-selection:v1\n";
/** @param document - Detached selection. @returns Budgeted, portable plain text. */
export function serializeFlowchartClipboard(document:FlowchartDocument):string{return flowchartClipboardPrefix+serializeFlowchart({...document,revision:0});}
/** @param source - System clipboard text, never HTML. @returns Strictly admitted original graph; unrelated text is rejected. */
export function parseFlowchartClipboard(source:string):FlowchartDocument{
  if(source.length>4000100)throw new RangeError("剪贴板图形过大");
  if(!source.startsWith(flowchartClipboardPrefix))throw new TypeError("剪贴板中没有 QuireKit 图形，请先复制图形选区");
  return parseFlowchart(source.slice(flowchartClipboardPrefix.length));
}
