<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { onBeforeUnmount, onMounted, shallowRef, ref, watch } from "vue";
import type { Editor, QuireJSONContent } from "@quirekit/core";
import { registerRichContentRenderer, createRichContentSurface } from "../../rich-content/surface";
import { registerRichContentHost } from "../../rich-content/tasks";
import type { RichContentRequest } from "../../rich-content/types";
import type { RichContentEntry } from "./types";
import { restoreBlockEditorFocus } from "../../ui/focus";
import { trackBlockObjectSelection } from "../objects/selection";
import ContentView from "./view.vue";
import ColumnsControls from "./columns-controls.vue";
import ColumnsForm from "./columns-form.vue";
import TemplateForm from "./template-form.vue";
import WebForm from "./web-form.vue";
import WebView from "../web-card/view.vue";
import AttachmentView from "../attachments/view.vue";
import ResourceForm from "./resource-form.vue";

const { t } = useBlockLocale();
const props=defineProps<{/** Canonical owner. */ editor:Editor; /** Live permission. */ editable:boolean}>();
const entries=shallowRef<readonly RichContentEntry[]>([]), request=shallowRef<RichContentRequest|null>(null), error=ref("");
let sequence=0;
let releaseSelection: (()=>void)|undefined;
onMounted(()=>{releaseSelection=trackBlockObjectSelection(props.editor);});
const releaseRenderer=registerRichContentRenderer(props.editor, context=>{
  const surface=createRichContentSurface(context,()=>{entry.node.value=surface.snapshot();},()=>{entries.value=entries.value.filter(item=>item!==entry);});
  const entry:RichContentEntry={key:++sequence,surface,node:shallowRef(surface.snapshot())};
  entries.value=[...entries.value,entry]; return surface;
});
const releaseTask=registerRichContentHost(props.editor, source=>{request.value=source;error.value="";});
/** Cancels without leaving a node or moving the insertion target. */
function close():void { request.value=null;error.value="";restoreBlockEditorFocus(props.editor); }
/** @param content - Prepared canonical content. */
function save(content:readonly QuireJSONContent[]):void {
  if (!request.value || !props.editor.commands.applyBlockRichContent(request.value,content)) {error.value="文档或权限已变化，请关闭后重新打开";return;}
  props.editor.commands.closeHistory();close();
}
watch(()=>props.editable,value=>{if(!value)request.value=null;});
onBeforeUnmount(()=>{releaseSelection?.();releaseRenderer();releaseTask();for(const entry of entries.value)entry.surface.destroy();});
</script>
<template>
  <Teleport v-for="entry in entries" :key="entry.key" :to="entry.surface.portal">
    <ColumnsControls v-if="entry.node.value.type.name==='blockColumns'" :surface="entry.surface" :node="entry.node.value" :editable="editable" />
    <WebView v-else-if="entry.node.value.type.name==='webCard'" :surface="entry.surface" :node="entry.node.value" :editable="editable" />
    <AttachmentView v-else-if="entry.node.value.type.name==='inlineAttachment'||entry.node.value.type.name==='blockAsset'&&entry.node.value.attrs.kind==='attachment'" :surface="entry.surface" :node="entry.node.value" :editable="editable" />
    <ContentView v-else :surface="entry.surface" :node="entry.node.value" :editable="editable" />
  </Teleport>
  <template v-if="request">
    <ColumnsForm v-if="request.kind==='columns'" :editor="editor" :request="request" :error="t(error)" @save="save" @close="close" />
    <TemplateForm v-else-if="request.kind==='template'" :editor="editor" :request="request" :error="t(error)" @save="save" @close="close" />
    <WebForm v-else-if="request.kind==='webCard'||request.kind==='embed'" :editor="editor" :request="request" :error="t(error)" @save="save" @close="close" />
    <ResourceForm v-else :editor="editor" :request="request" :error="t(error)" @save="save" @close="close" />
  </template>
</template>
