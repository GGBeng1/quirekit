import { parseFlowchartClipboard, removeFlowchartSelection, serializeFlowchartClipboard } from "@quirekit/flowchart";
import type { FlowchartEditor } from "../../../types";
import { readGraph } from "../../../codec/read";
import { requireIdle } from "../../commands";
import { requireAuthoring } from "../../structure/permissions";
import { applyStructure } from "../../structure/apply";
import { insertDocument, selectedDocument } from "./operations";
import type { FlowRuntime, FlowTextInput } from "../../types";

/** @param runtime - Isolated lifetime. @param text - Native input owner. @returns Native clipboard binding and explicit gesture-driven menu actions. */
export function createFlowClipboard(runtime:FlowRuntime,text:FlowTextInput):Pick<FlowchartEditor,"copyToClipboard"|"pasteFromClipboard"> & {destroy():void}{
  const {mount,graph}=runtime;
  /** @returns Captured mutation and selection token, with no document read. */
  function token():string{return `${runtime.changes}:${graph.getSelectedCells().map(c=>c.id).join("|")}`;}
  /** @param expected - Original intent. Rejects stale asynchronous clipboard completion. */
  function guard(expected:string):void{
    requireAuthoring(runtime);requireIdle(runtime,text);
    if(token()!==expected)throw new Error("图形或选区已变化，请重新操作剪贴板");
  }
  /** @param cut - Whether deletion follows successful clipboard write. @returns Source and prevalidated optional removal. */
  function capture(cut:boolean){
    if(cut)requireAuthoring(runtime);
    const fragment=selectedDocument(runtime,text), before=readGraph(graph,runtime.options.document.revision);
    const after=cut?removeFlowchartSelection(before,graph.getSelectedCells().map(c=>c.id)):undefined;
    return {encoded:serializeFlowchartClipboard(fragment),before,after,expected:token()};
  }
  /** @param event - Native clipboard intent owned by this mount. */
  function clipboard(event:ClipboardEvent):void{
    event.stopPropagation();
    if((event.target as Element).closest("textarea,input,[contenteditable]")||text.isComposing())return;
    event.preventDefault();
    if(!event.clipboardData)return;
    try{
      if(event.type==="paste"){
        guard(token());insertDocument(runtime,text,parseFlowchartClipboard(event.clipboardData.getData("text/plain")));
      }else{
        const result=capture(event.type==="cut");event.clipboardData.setData("text/plain",result.encoded);
        if(result.after){
          if(event.clipboardData.getData("text/plain")!==result.encoded)throw new Error("剪贴板写入失败，原图已保留");
          guard(result.expected);applyStructure(runtime,result.before,result.after,[]);
        }
      }
    }catch(error){runtime.fail(error);}
  }
  for(const event of ["copy","cut","paste"])mount.addEventListener(event,clipboard as EventListener);
  return {
    /** @param cut - Delete only after a successful, still-current write. @returns Completion of explicit system clipboard write. */
    async copyToClipboard(cut=false){
      const result=capture(cut), clipboard=mount.ownerDocument.defaultView?.navigator.clipboard;
      if(!clipboard)throw new Error("当前环境无法访问剪贴板，请使用 Ctrl/⌘ C 或 X");
      await clipboard.writeText(result.encoded);
      if(result.after){guard(result.expected);applyStructure(runtime,result.before,result.after,[]);}
    },
    /** @returns Completion of guarded, explicit system clipboard read and one paste. */
    async pasteFromClipboard(){
      requireIdle(runtime,text);const expected=token();guard(expected);
      const clipboard=mount.ownerDocument.defaultView?.navigator.clipboard;
      if(!clipboard)throw new Error("当前环境无法访问剪贴板，请使用 Ctrl/⌘ V");
      const encoded=await clipboard.readText();guard(expected);insertDocument(runtime,text,parseFlowchartClipboard(encoded));
    },
    /** Releases only this instance's clipboard listeners. */
    destroy(){for(const event of ["copy","cut","paste"])mount.removeEventListener(event,clipboard as EventListener);},
  };
}
