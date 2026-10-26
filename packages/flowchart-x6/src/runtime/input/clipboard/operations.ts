import { copyFlowchartSelection, flowchartFragmentBounds, placeFlowchartFragment, readFlowchart, serializeFlowchart } from "@quirekit/flowchart";
import type { FlowchartDocument, FlowchartPoint } from "@quirekit/flowchart";
import { requireIdle } from "../../commands";
import { requireAuthoring } from "../../structure/permissions";
import { readGraph } from "../../../codec/read";
import { appendGraph } from "../../content";
import type { FlowRuntime, FlowTextInput } from "../../types";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Source authority. @param text - Native input. @returns Valid detached selection even in read-only mode. */
export function selectedDocument(runtime:FlowRuntime,text:FlowTextInput):FlowchartDocument{
  requireIdle(runtime,text);
  return copyFlowchartSelection(readGraph(runtime.graph,0),runtime.graph.getSelectedCells().map(c=>c.id));
}
/** @param runtime - Writable instance. @param text - Native input. @param document - Clipboard or component. @param point - Optional world top-left; otherwise current viewport center. */
export function insertDocument(runtime:FlowRuntime,text:FlowTextInput,document:FlowchartDocument,point?:FlowchartPoint):void{
  requireAuthoring(runtime);requireIdle(runtime,text);
  const checked=readFlowchart(document);
  if(runtime.graph.getCellCount()+checked.nodes.length+checked.edges.length>10000)throw new RangeError("图形数量已达上限");
  const bounds=flowchartFragmentBounds(checked),rect=runtime.mount.getBoundingClientRect(),center=runtime.graph.clientToLocal(rect.x+rect.width/2,rect.y+rect.height/2);
  const source=placeFlowchartFragment(checked,`paste-${uuidv4()}`,point??{x:center.x-bounds.width/2,y:center.y-bounds.height/2});
  const existing=readGraph(runtime.graph,runtime.options.document.revision);
  serializeFlowchart(readFlowchart({...existing,nodes:[...existing.nodes,...source.nodes],edges:[...existing.edges,...source.edges]}));
  runtime.graph.batchUpdate("paste",()=>appendGraph(runtime,source));
  runtime.graph.resetSelection(source.nodes.length?source.nodes.filter(n=>!n.parent).map(n=>n.id):source.edges.map(e=>e.id));
}
