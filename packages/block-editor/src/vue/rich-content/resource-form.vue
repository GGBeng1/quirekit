<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, onBeforeUnmount, ref } from "vue";
import { v4 } from "uuid";
import type { Editor, QuireJSONContent } from "@quirekit/core";
import { QuireDialogRoot, QuireDialogContent, QuireButton, QuireInput, QuireField, QuireFileUpload, QuireIconButton, QuireIcon, QuireSegmented } from "@quirekit/ui/vue";
import type { BlockResource, RichContentRequest } from "../../rich-content/types";
import { storeBlockFiles, richContentOptions } from "../../resources/files";
import { webURL } from "../../rich-content/urls";
import { validResources } from "../../resources/model";

const { t, localize } = useBlockLocale();
const props=defineProps<{/** Owner. */ editor:Editor;/** Captured task. */ request:RichContentRequest;/** Commit feedback. */ error:string}>();
const emit=defineEmits<{save:[content:readonly QuireJSONContent[]];close:[]}>();
const kind=props.request.kind, gallery=kind==="imageGallery", single=kind==="audio"||kind==="video";
const labels:Record<string,string>={imageGallery:"多图",attachment:"附件",audio:"音频",video:"视频"};
const items=ref<BlockResource[]>(props.request.node?.attrs.items?.map((item:BlockResource)=>({...item}))??[]);
const files=ref<File[]>([]),caption=ref(String(props.request.node?.attrs.caption??"")),columns=ref(String(props.request.node?.attrs.columns??3));
const mode=ref("file"),url=ref(""),name=ref(""),error=ref(""),busy=ref(false),progress=ref(0),dragIndex=ref<number|null>(null);
const presentation=ref(props.request.node?.isInline?"inline":"card");
const options=richContentOptions(props.editor),accept=gallery?"image/png,image/jpeg,image/webp,image/gif,image/avif":kind==="audio"?"audio/*":kind==="video"?"video/*":undefined;
const canSave=computed(()=>items.value.length>0||files.value.length>0);
let controller:AbortController|undefined;
/** @param index - Item to change. @param value - New display name. */
function rename(index:number,value:string):void {items.value=items.value.map((item,i)=>i===index?{...item,name:value}:item);}
/** @param from - Source ordinal. @param to - Final ordinal. */
function move(from:number,to:number):void {
  if(from<0||to<0||from>=items.value.length||to>=items.value.length)return;
  const next=[...items.value], [item]=next.splice(from,1);next.splice(to,0,item!);items.value=next;
}
/** @param event - Native drag. @param index - Stable start ordinal. */
function drag(event:DragEvent,index:number):void {dragIndex.value=index;if(event.dataTransfer){event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",items.value[index]!.id);}}
/** @param index - Final ordering target. */
function drop(index:number):void {if(dragIndex.value!==null)move(dragIndex.value,index);dragIndex.value=null;}
/** Adds a durable remote source to the draft; no document mutation. */
function addURL():void {
  const src=webURL(url.value);if(!src){error.value="请输入完整的 http 或 https 文件地址";return;}
  if(items.value.length>=24&&!single){error.value="每组最多 24 个文件";return;}
  let filename=name.value.trim();
  if(!filename){try{filename=decodeURIComponent(new URL(src).pathname.split("/").pop()||"")}catch{/* Keep the explicit role fallback for malformed escaped path names. */}}
  const item:BlockResource={id:v4(),src,name:filename||t(labels[kind]!),mime:gallery?"image/jpeg":kind==="audio"?"audio/mpeg":kind==="video"?"video/mp4":"application/octet-stream"};
  items.value=single?[item]:[...items.value,item];files.value=[];url.value="";name.value="";error.value="";
}
/** Prepares files under a cancellable source-bound task, then commits all changes once. */
async function save():Promise<void> {
  if(busy.value)return;error.value="";busy.value=true;progress.value=0;const task=controller=new AbortController();
  try {
    if(!props.editor.isEditable||props.editor.state.doc!==props.request.doc)throw new Error("文档或权限已变化，请重新打开");
    const prepared=files.value.length?await storeBlockFiles(props.editor,files.value,task.signal,value=>progress.value=value):[];
    if(task.signal.aborted)return;
    const next=single&&prepared.length?prepared:[...items.value,...prepared];
    const family=gallery?"image/":kind==="audio"?"audio/":kind==="video"?"video/":undefined;
    if(!validResources(next,family))throw new Error("请检查文件名称、类型和数量");
    if(!props.editor.isEditable||props.editor.state.doc!==props.request.doc)throw new Error("文档或权限已变化，请重新打开");
    emit("save",[{type:gallery?"imageGallery":kind==="attachment"&&presentation.value==="inline"?"inlineAttachment":"blockAsset",attrs:{...props.request.node?.attrs,items:next,kind,caption:caption.value.trim(),columns:Number(columns.value)}}]);
  } catch(cause) {if(!task.signal.aborted)error.value=cause instanceof Error?cause.message:"文件读取失败，请重试";}
  finally {if(!task.signal.aborted)busy.value=false;}
}
/** Cancels both file reading and the uncommitted document changes. */
function close():void {controller?.abort();emit("close");}
onBeforeUnmount(()=>controller?.abort());
</script>
<template>
  <QuireDialogRoot open :restore-focus="false" @update:open="!$event&&close()">
    <QuireDialogContent :title="t('{action}{kind}', { action: request.node ? t('编辑') : t('插入'), kind: t(labels[kind]!) })" :size="gallery?'medium':'small'" :error-text="t(props.error||error)">
      <div class="qk-rich-form">
        <div v-if="items.length" class="qk-rich-resource-list" :aria-label="t(gallery?t('图片顺序'):t('已选文件'))">
          <div v-for="(item,index) in items" :key="item.id" class="qk-rich-resource-row" :draggable="gallery&&!busy" @dragstart="drag($event,index)" @dragend="dragIndex=null" @dragover.prevent @drop.prevent="drop(index)">
            <QuireIcon v-if="gallery" name="gripVertical" />
            <img v-if="gallery" :src="item.src" :alt="item.alt||item.name" draggable="false" />
            <QuireIcon v-else :name="single?kind==='audio'?'headphones':'video':'paperclip'" :size="24" />
            <QuireInput :model-value="item.name" :aria-label="t('文件名称 {index}', { index: index + 1 })" width="100%" :disabled="busy" @update:model-value="rename(index,$event)" />
            <div class="qk-rich-row-actions">
              <QuireIconButton v-if="gallery" :label="t('前移图片 {index}', { index: index + 1 })" variant="ghost" :disabled="busy||index===0" @click="move(index,index-1)"><QuireIcon name="arrowUp" /></QuireIconButton>
              <QuireIconButton v-if="gallery" :label="t('后移图片 {index}', { index: index + 1 })" variant="ghost" :disabled="busy||index===items.length-1" @click="move(index,index+1)"><QuireIcon name="arrowDown" /></QuireIconButton>
              <QuireIconButton :label="t('移除文件 {index}', { index: index + 1 })" variant="ghost" :disabled="busy" @click="items=items.filter(r=>r.id!==item.id)"><QuireIcon name="trash" /></QuireIconButton>
            </div>
          </div>
        </div>
        <QuireSegmented v-model="mode" :label="t('文件来源')" :disabled="busy" :items="localize([{value:'file',label:t('本地文件')},{value:'url',label:t('网络链接')}])" />
        <QuireFileUpload v-if="mode==='file'" v-model="files" :label="t(items.length?single?t('替换文件'):t('添加文件'):t('选择文件'))" :accept="accept" :multiple="!single" :max-files="single?1:Math.max(0,24-items.length)" :max-file-size="options.maxFileSize" :disabled="busy||!single&&items.length>=24" />
        <div v-else class="qk-rich-form">
          <QuireField :label="t('文件地址')"><template #default="{controlProps}"><QuireInput v-bind="controlProps" v-model="url" type="url" width="100%" placeholder="https://" :disabled="busy" /></template></QuireField>
          <QuireField :label="t('文件名称')"><template #default="{controlProps}"><QuireInput v-bind="controlProps" v-model="name" width="100%" :placeholder="t('可选，默认取链接中的文件名')" :disabled="busy" /></template></QuireField>
          <QuireButton variant="soft" :disabled="!webURL(url)||busy" @click="addURL">{{single&&items.length?t('替换链接'):t('添加链接')}}</QuireButton>
        </div>
        <QuireSegmented v-if="gallery" v-model="columns" :label="t('每行图片数')" :disabled="busy" :items="localize([{value:'2',label:t('两张')},{value:'3',label:t('三张')},{value:'4',label:t('四张')}])" />
        <QuireSegmented v-if="kind==='attachment'&&!request.node" v-model="presentation" :label="t('附件展示方式')" :disabled="busy" :items="localize([{value:'inline',label:t('行内')},{value:'card',label:t('卡片')}])" />
        <QuireField :label="t('说明')"><template #default="{controlProps}"><QuireInput v-bind="controlProps" v-model="caption" width="100%" :placeholder="t('可选')" :disabled="busy" /></template></QuireField>
        <p v-if="busy" role="status" class="qk-rich-help">{{ t("正在准备文件") }} {{progress}}%</p>
      </div>
      <template #footer><QuireButton variant="text" @click="close">{{ t("取消") }}</QuireButton><QuireButton variant="solid" color="primary" :disabled="!canSave||busy" @click="save">{{busy?t('正在准备…'):request.node?t('保存'):t('插入')}}</QuireButton></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
