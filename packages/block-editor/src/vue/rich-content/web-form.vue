<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref, onBeforeUnmount } from "vue";
import type { Editor, QuireJSONContent } from "@quirekit/core";
import { QuireDialogRoot, QuireDialogContent, QuireButton, QuireInput, QuireTextarea, QuireField, QuireSegmented, QuireSelect } from "@quirekit/ui/vue";
import type { RichContentRequest } from "../../rich-content/types";
import { webURL } from "../../rich-content/urls";
import { richContentOptions } from "../../resources/files";
import { readWebMetadata, webLinkTitle } from "../../web-card/metadata";
import { webLinkViews } from "../web-card/menu";
import WebCard from "../web-card/card.vue";

const { t, localize } = useBlockLocale();
const props=defineProps<{/** Owner. */ editor:Editor;/** Captured source. */ request:RichContentRequest;/** Commit feedback. */ error:string}>();
const emit=defineEmits<{save:[content:readonly QuireJSONContent[]];close:[]}>();
const attrs=props.request.node?.attrs;
const url=ref(String(attrs?.url??"")),title=ref(String(attrs?.title??"")),description=ref(String(attrs?.description??""));
const mode=ref(props.request.kind==="embed"?"preview":"card"),height=ref(String(attrs?.height??360)),error=ref(""),busy=ref(false);
const icon=ref(String(attrs?.icon??"")),cover=ref(String(attrs?.cover??""));
const normalized=computed(()=>webURL(url.value)), domain=computed(()=>normalized.value?new URL(normalized.value).hostname:"网页预览");
const metadata=computed(()=>readWebMetadata({url:normalized.value,title:title.value.trim(),description:description.value.trim(),icon:icon.value,cover:cover.value,height:Number(height.value)}));
const options=richContentOptions(props.editor);
let controller:AbortController|undefined;
/** Resolves metadata only through an explicitly configured host service. */
async function resolve():Promise<void> {
  if(!normalized.value||!options.resolveWebCard)return;
  controller?.abort();const current=controller=new AbortController(),source=normalized.value;busy.value=true;error.value="";
  try {const result=await options.resolveWebCard(source,current.signal);if(!current.signal.aborted&&normalized.value===source){title.value=result.title??title.value;description.value=result.description??description.value;icon.value=result.icon??icon.value;cover.value=result.cover??cover.value;}}
  catch {if(!current.signal.aborted)error.value="网页信息读取失败，可以手动填写或重试";}
  finally {if(!current.signal.aborted)busy.value=false;}
}
/** Confirms the chosen presentation; preview is an explicit request to load its source. */
function save():void {
  if(!metadata.value){error.value="请输入完整的 http 或 https 网页地址";return;}
  const web=metadata.value;
  emit("save",mode.value==='link'||mode.value==='title' ? [{type:'paragraph',content:[{type:'text',text:mode.value==='link'?web.url:webLinkTitle(web),marks:[{type:'link',attrs:{href:web.url,web}}]}]}]
    : [{type:"webCard",attrs:{...attrs,...web,mode:mode.value==='preview'?'embed':'card'}}]);
}
onBeforeUnmount(()=>controller?.abort());
</script>
<template>
  <QuireDialogRoot open :restore-focus="false" @update:open="!$event&&emit('close')">
    <QuireDialogContent :title="request.node?t('编辑网页'):t('插入网页')" size="small" :error-text="t(props.error||error)">
      <div class="qk-rich-form">
        <QuireField :label="t('网页地址')" required><template #default="{controlProps}"><QuireInput v-bind="controlProps" v-model="url" type="url" width="100%" placeholder="https://" :invalid="!!url&&!normalized" /></template></QuireField>
        <QuireButton v-if="options.resolveWebCard" variant="soft" :disabled="!normalized||busy" @click="resolve">{{busy?t('正在读取…'):t('读取网页信息')}}</QuireButton>
        <QuireSegmented v-model="mode" :label="t('网页展示方式')" :items="localize(webLinkViews.filter(item=>editor.state.schema.marks.link||item.value==='card'||item.value==='preview'))" />
        <QuireField :label="t('标题')"><template #default="{controlProps}"><QuireInput v-bind="controlProps" v-model="title" width="100%" :placeholder="t(domain)" /></template></QuireField>
        <QuireField :label="t('说明')"><template #default="{controlProps}"><QuireTextarea v-bind="controlProps" v-model="description" :rows="2" :placeholder="t('可选')" /></template></QuireField>
        <QuireField v-if="mode==='card'" :label="t('封面地址')"><template #default="{controlProps}"><QuireInput v-bind="controlProps" v-model="cover" width="100%" :placeholder="t('可选')" /></template></QuireField>
        <QuireSelect v-if="mode==='preview'" v-model="height" :label="t('预览高度')" width="100%" :items="localize([240,360,480,640].map(value=>({value:String(value),label:value+' px'})))" />
        <WebCard v-if="metadata&&mode==='card'" :metadata="metadata" />
      </div>
      <template #footer><QuireButton variant="text" @click="emit('close')">{{ t("取消") }}</QuireButton><QuireButton variant="solid" color="primary" :disabled="!normalized||busy" @click="save">{{request.node?t('保存'):t('插入')}}</QuireButton></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
