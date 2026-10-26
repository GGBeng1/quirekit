import { useFlowMessages } from "../messages";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { instantiateFlowchart } from "@quirekit/flowchart";
import type { FlowchartDocument } from "@quirekit/flowchart";
import { createLocalFlowLibraryStore } from "../../library/local";
import { appendFlowLibrary } from "../../library/operations";
import { flowLibraryLimit, flowLibraryName, parseFlowLibrary, readFlowLibrarySnapshot, serializeFlowLibrary } from "../../library/format";
import type { FlowLibrary, FlowLibraryItem, FlowLibrarySnapshot } from "../../library/types";
import type { FlowLibraryDraft, FlowLibraryPanelProps } from "./types";
import { v4 as uuidv4 } from "uuid";
/** @param props - One dialog's source and store. @param close - Successful apply dismissal. @returns Cancel-safe library interaction state. */
export function useFlowLibrary(props:FlowLibraryPanelProps,close:()=>void) {
  const { t } = useFlowMessages(), importedCount = ref(0);
  const snapshot=shallowRef<FlowLibrarySnapshot>(),draft=shallowRef<FlowLibraryDraft>(),name=ref(""),selected=ref(""),busy=ref(false),error=ref(""),statusKey=ref("");
  const status = computed(() => t(statusKey.value, { count: importedCount.value }));
  const store=props.store??createLocalFlowLibraryStore(window),owner=props.editor,abort=new AbortController();
  let baseline:FlowchartDocument|undefined,reading=0,release=()=>{};
  /** Rejects work belonging to a dismissed or replaced graph. */
  function active():void {abort.signal.throwIfAborted();if(owner!==props.editor)throw new Error("画布已改变，请重新打开图形库");}
  /** @returns Completion of a last-read-wins snapshot refresh. */
  async function refresh():Promise<void> {
    const ticket=++reading;
    try {const next=readFlowLibrarySnapshot(await store.read(abort.signal));active();if(ticket===reading)snapshot.value=next;}
    catch(reason){if(!abort.signal.aborted&&ticket===reading)error.value=reason instanceof Error?reason.message:String(reason);}
  }
  /** @returns Explicit refresh that also clears a previous recoverable error. */
  async function retry():Promise<void> {error.value="";await refresh();}
  /** @param action - Explicit user operation. @returns Completion with draft-preserving errors. */
  async function run(action:()=>Promise<void>):Promise<void> {
    if(busy.value)return;busy.value=true;error.value="";statusKey.value="";
    try {active();await action();}catch(reason){if(!abort.signal.aborted){error.value=reason instanceof Error?reason.message:String(reason);await refresh();}}
    finally {if(!abort.signal.aborted)busy.value=false;}
  }
  /** @param next - Complete validated content derived from the current snapshot. @returns Committed storage operation. */
  async function write(next:FlowLibrary):Promise<void> {
    if(!snapshot.value)throw new Error("请先成功读取图形库");const revision=snapshot.value.revision;
    const saved=await store.write(next,revision,abort.signal);active();++reading;snapshot.value=readFlowLibrarySnapshot(saved);
  }
  /** @param kind - Whole graph or current selection. @returns Captured source ready to name. */
  async function begin(kind:"template"|"component"):Promise<void> {
    await run(async()=>{const source=kind==="template"?await owner.getDocument():owner.getSelection();active();draft.value={kind,document:source};name.value="";});
  }
  /** @param item - Current library entry. Opens a rename draft without mutating source. */
  function rename(item:FlowLibraryItem):void {draft.value={original:item,kind:item.kind,document:item.document};name.value=item.name;}
  /** @returns Atomic save/rename; stale record edits preserve the draft. */
  async function save():Promise<void> {
    await run(async()=>{
      if(!draft.value||!snapshot.value)return;
      const value=draft.value,original=value.original;
      if(original&&JSON.stringify(snapshot.value.library.items.find(i=>i.id===original.id))!==JSON.stringify(original))throw new Error("这一项已在其他窗口更新，请重新选择后重命名");
      const item:FlowLibraryItem={id:original?.id??uuidv4(),name:flowLibraryName(name.value),kind:value.kind,document:value.document};
      const library=snapshot.value.library;
      await write({...library,items:original?library.items.map(i=>i.id===item.id?item:i):[...library.items,item]});
      selected.value=item.id;draft.value=undefined;statusKey.value="已保存到图形库";
    });
  }
  /** @param item - Explicitly confirmed current entry. @returns Atomic removal. */
  async function remove(item:FlowLibraryItem):Promise<void> {
    await run(async()=>{
      if(!snapshot.value)return;
      if(JSON.stringify(snapshot.value.library.items.find(i=>i.id===item.id))!==JSON.stringify(item))throw new Error("这一项已更新，请重新选择后删除");
      await write({...snapshot.value.library,items:snapshot.value.library.items.filter(i=>i.id!==item.id)});selected.value="";statusKey.value="已删除";
    });
  }
  /** @param file - Explicitly selected local JSON. @returns Validated all-or-nothing append. */
  async function importFile(file:File):Promise<void> {
    await run(async()=>{
      if(file.size>flowLibraryLimit*3)throw new RangeError("图形库文件过大");
      const imported=parseFlowLibrary(await file.text());active();if(!snapshot.value)throw new Error("请先成功读取图形库");
      await write(appendFlowLibrary(snapshot.value.library,imported));importedCount.value=imported.items.length;statusKey.value="已导入 {count} 项";
    });
  }
  /** Exports only the last validated snapshot, never storage metadata or arbitrary markup. */
  function exportFile():void {
    if(!snapshot.value)return;
    const url=URL.createObjectURL(new Blob([serializeFlowLibrary(snapshot.value.library)],{type:"application/json"})),link=document.createElement("a");
    link.href=url;link.download=`${t("我的图形库")}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  /** @param item - Selected validated content. @returns Applied graph with one undo boundary. */
  async function apply(item:FlowLibraryItem):Promise<void> {
    await run(async()=>{
      if(props.disabled||owner.getState().readOnly||!baseline)throw new Error("当前画布不可编辑");
      const current=await owner.getDocument();active();
      if(props.disabled||owner.getState().readOnly||JSON.stringify(current)!==JSON.stringify(baseline))throw new Error("画布已改变，请重新打开图形库");
      if(item.kind==="component")owner.insertDocument(item.document);
      else {owner.replaceDocument({...instantiateFlowchart(item.document,`library-${uuidv4()}`),revision:current.revision});owner.fit();}
      close();
    });
  }
  onMounted(async()=>{
    release=store.subscribe(()=>{void refresh();});
    await run(async()=>{baseline=await owner.getDocument();active();});await refresh();
    if(!abort.signal.aborted&&snapshot.value&&props.intent!=="browse")await begin(props.intent);
  });
  onBeforeUnmount(()=>{abort.abort();release();++reading;});
  return {snapshot,draft,name,selected,busy,error,status,retry,begin,rename,save,remove,importFile,exportFile,apply};
}
