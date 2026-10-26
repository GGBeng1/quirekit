<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, onBeforeUnmount, shallowRef, watch } from "vue";
import type { Node as PMNode } from "@quirekit/pm";
import { QuireIcon } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { RichContentSurface } from "../../rich-content/types";
import { openRichContent } from "../../rich-content/tasks";
import ObjectToolbar from "../objects/toolbar.vue";

const { t, localize } = useBlockLocale();
const props=defineProps<{/** Retained layout. */ surface:RichContentSurface;/** Current source. */ node:PMNode;/** Live policy. */ editable:boolean}>();
const widths=computed(()=>props.node.attrs.widths as number[]);
const preview=shallowRef<{ index:number; widths:number[] }|null>(null);
const displayed=computed(()=>preview.value?.widths??widths.value);
const tools=computed<readonly QuireKitToolbarEntry[]>(()=>props.editable?[
  {value:'layout',label:'分栏布局',icon:'columns2'},
  {value:'unwrap',label:'解除分栏',icon:'rows2'}
]:[]);
/** @param value - Shared floating toolbar intent. */
function execute(value:string):void {
  const pos=props.surface.position();
  if(!props.editable||!props.surface.editor.isEditable||pos===undefined)return;
  if(value==='layout')openRichContent(props.surface.editor,'columns',undefined,pos);
  else if(value==='unwrap')props.surface.editor.commands.unwrapBlockColumns(pos);
}
let cleanup: (()=>void)|undefined;
/** @param index - Divider. @returns Relative location between adjacent columns. */
function offset(index:number):number { return displayed.value.slice(0,index+1).reduce((sum,value)=>sum+value,0); }
/** @param next - Final ratios. @param doc - Pointer-down source. */
function apply(next:number[],doc=props.surface.editor.state.doc):void {
  const position=props.surface.position(), editor=props.surface.editor;
  if(props.editable&&position!==undefined&&editor.state.doc===doc) {editor.commands.setBlockColumns(position,next);editor.commands.closeHistory();}
}
/** @param event - Divider keyboard input. @param index - Adjacent pair. */
function key(event:KeyboardEvent,index:number):void {
  if(!["ArrowLeft","ArrowRight"].includes(event.key))return;
  event.preventDefault(); const next=[...widths.value], delta=event.key==="ArrowRight"?2:-2, total=next[index]!+next[index+1]!;
  next[index]=Math.max(10,total-80,Math.min(80,total-10,next[index]!+delta)); next[index+1]=total-next[index]!; apply(next);
}
/** @param event - Pointer session origin. @param index - Divider pair. */
function drag(event:PointerEvent,index:number):void {
  if(event.button!==0||event.isPrimary===false||!props.editable||!props.surface.editor.isEditable)return;
  event.preventDefault();event.stopPropagation();cleanup?.();
  const editor=props.surface.editor, doc=editor.state.doc, grid=props.surface.contentDOM!, source=[...widths.value];
  const width=grid.getBoundingClientRect().width-24*(source.length-1), start=event.clientX, owner=grid.ownerDocument, control=event.currentTarget as HTMLElement;
  if(width<=0)return;
  let next=[...source], latest=start, frame:number|undefined;
  preview.value={index,widths:source};
  control.setPointerCapture(event.pointerId);
  // Measure once at session start. A frame consumes only the latest client
  // coordinate and projects this grid and its at most three separators together.
  /** Projects the latest pointer without changing canonical content or selection. */
  function render():void {
    frame=undefined;
    const total=source[index]!+source[index+1]!;
    next=[...source];next[index]=Math.round(Math.max(10,total-80,Math.min(80,total-10,source[index]!+(latest-start)/width*100))*10)/10;next[index+1]=Math.round((total-next[index]!)*10)/10;
    grid.style.gridTemplateColumns=next.map(value=>`minmax(0,${value}fr)`).join(" ");
    preview.value={index,widths:next};
  }
  /** @param current - Latest raw pointer sample; unrelated pointers cannot take over. */
  function move(current:PointerEvent):void {
    if(current.pointerId!==event.pointerId)return;
    latest=current.clientX;
    if(frame===undefined)frame=requestAnimationFrame(render);
  }
  /** Releases listeners and restores canonical presentation before optional commit. */
  function stop():void {
    if(frame!==undefined)cancelAnimationFrame(frame);
    owner.removeEventListener("pointermove",move);owner.removeEventListener("pointerup",up);owner.removeEventListener("pointercancel",cancel);owner.removeEventListener("keydown",escape);
    owner.defaultView?.removeEventListener("blur",stop);owner.defaultView?.removeEventListener("resize",stop);editor.off("update",changed);
    if(control.hasPointerCapture(event.pointerId))control.releasePointerCapture(event.pointerId);
    grid.style.gridTemplateColumns=(props.surface.snapshot().attrs.widths as number[]).map(value=>`minmax(0,${value}fr)`).join(" ");
    preview.value=null;cleanup=undefined;
  }
  /** @param current - Final pointer endpoint. */
  function up(current:PointerEvent):void {
    if(current.pointerId!==event.pointerId)return;
    if(frame!==undefined)cancelAnimationFrame(frame);
    latest=current.clientX;render();stop();if(next.some((v,i)=>v!==source[i]))apply(next,doc);
  }
  /** Cancels without a document transaction. @param current - Browser cancellation for this pointer. */
  function cancel(current:PointerEvent):void {if(current.pointerId===event.pointerId)stop();}
  /** Invalidates a preview as soon as its source or permission changes. */
  function changed():void {if(editor.state.doc!==doc||!editor.isEditable)stop();}
  /** @param current - Session cancellation key. */
  function escape(current:KeyboardEvent):void {if(current.key==="Escape"){current.preventDefault();stop();}}
  cleanup=stop;owner.addEventListener("pointermove",move);owner.addEventListener("pointerup",up);owner.addEventListener("pointercancel",cancel);owner.addEventListener("keydown",escape);
  owner.defaultView?.addEventListener("blur",stop,{once:true});owner.defaultView?.addEventListener("resize",stop,{once:true});editor.on("update",changed);
}
watch(()=>props.editable,value=>{if(!value)cleanup?.();});
onBeforeUnmount(()=>cleanup?.());
</script>
<template>
  <ObjectToolbar :surface="surface" :label="t('分栏快捷工具')" :items="localize(tools)" @execute="execute($event.value)" />
  <button v-for="(_,index) in widths.slice(0,-1)" v-show="editable" :key="index" class="qk-rich-column-divider" data-rich-interactive :data-resizing="preview?.index===index||undefined"
    :style="{left:`calc(${offset(index)}% + ${(index+0.5)*24-offset(index)/100*24*(widths.length-1)}px)`}" role="separator" aria-orientation="vertical" :aria-label="t('调整第 {index} 栏宽度', { index: index + 1 })"
    :aria-valuenow="Math.round(displayed[index]!)" :aria-valuemin="Math.max(10,widths[index]!+widths[index+1]!-80)" :aria-valuemax="Math.min(80,widths[index]!+widths[index+1]!-10)"
    @pointerdown="drag($event,index)" @keydown="key($event,index)">
    <span class="qk-rich-column-grip" aria-hidden="true"><QuireIcon name="gripVertical" :size="12" /></span>
  </button>
</template>
