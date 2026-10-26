import { nextTick, onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { FlowchartDocument } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { QuireKitTheme } from "@quirekit/ui";
import { createFlowEditor } from "../../runtime/create";
/** @param mount - Inert preview surface. @param source - Only the current choice. @param theme - Current appearance. @returns Cancellable single-preview state. */
export function useLibraryPreview(mount:Ref<HTMLElement|undefined>,source:()=>FlowchartDocument|undefined,theme:()=>QuireKitTheme) {
  const url=ref(""),error=ref(""),loading=ref(false);let generation=0,abort:AbortController|undefined,editor:FlowchartEditor|undefined;
  /** Invalidates pending rendering and releases observers, graph and object URL. */
  function stop():void {++generation;abort?.abort();editor?.destroy();editor=undefined;if(url.value)URL.revokeObjectURL(url.value);url.value="";}
  /** @returns One selected-source render; browsing never reads the user's graph. */
  async function render():Promise<void> {
    stop();const document=source(),ticket=generation,controller=new AbortController();abort=controller;error.value="";loading.value=!!document;
    if(!document)return;
    let renderer:FlowchartEditor|undefined;
    try {
      await nextTick();if(ticket!==generation||!mount.value)return;
      renderer=await createFlowEditor({container:mount.value,document,theme:theme(),readOnly:true,signal:controller.signal,label:"图形库预览渲染"});
      if(ticket!==generation)return;editor=renderer;const snapshot=await renderer.exportSvg();
      if(ticket===generation)url.value=URL.createObjectURL(new Blob([snapshot.svg],{type:"image/svg+xml"}));
    }catch(reason){if(ticket===generation&&!controller.signal.aborted)error.value=reason instanceof Error?reason.message:String(reason);}
    finally {renderer?.destroy();if(ticket===generation){editor=undefined;loading.value=false;}}
  }
  watch([source,theme],()=>{void render();},{immediate:true});onBeforeUnmount(stop);
  return {url,error,loading};
}
