<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed } from "vue";
import type { Node as PMNode } from "@quirekit/pm";
import { QuireAttachments, QuireFileIcon } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitAttachmentActionDetails } from "@quirekit/ui";
import type { BlockResource, RichContentSurface } from "../../rich-content/types";
import type { BlockAttachmentView } from "../../attachments/types";
import { openRichContent } from "../../rich-content/tasks";
import ObjectToolbar from "../objects/toolbar.vue";

const { t, localize } = useBlockLocale();
const props = defineProps<{
  /** Retained file owner. */ surface: RichContentSurface;
  /** Current canonical node. */ node: PMNode;
  /** Live permission. */ editable: boolean;
}>();
const resources = computed(() => props.node.attrs.items as BlockResource[]);
const inline = computed(() => props.node.isInline), mode = computed(() => inline.value ? "inline" : "card");
const fileItems = computed(() => resources.value.map(item => ({ id:item.id, name:item.name, mediaType:item.mime, ...(item.size===undefined?{}:{size:item.size}), url:item.src, actions: inline.value ? [] : ["download"] as const })));
const modes = [{value:"inline",label:"行内视图",icon:"type"},{value:"card",label:"卡片视图",icon:"panelTop"}] as const;
const tools = computed<readonly QuireKitToolbarEntry[]>(() => {
  const pos=props.surface.position(),editor=props.surface.editor;
  return [
    ...(props.editable ? modes.map(item=>{
      const disabled=pos===undefined || !editor.can().setBlockAttachmentView(pos,props.node,item.value);
      return {...item,value:`view:${item.value}`,kind:"toggle" as const,pressed:mode.value===item.value,disabled,
        ...(disabled?{disabledReason:"当前位置不支持此视图"}:{})};
    }) : []),
    ...(props.editable ? [{value:"views",label:"",kind:"separator" as const},{value:"edit",label:"编辑附件",icon:"edit"}] : []),
    {value:"download",label:"下载文件",icon:"download"},
    ...(props.editable ? [{value:"delete",label:"删除附件",icon:"trash"}] : [])
  ];
});
/** @param resource - Explicitly requested original file; no preview service is implied. */
function download(resource: BlockResource): void {
  const link=props.surface.dom.ownerDocument.createElement("a");link.href=resource.src;link.download=resource.name;link.target="_blank";link.rel="noopener noreferrer";link.click();
}
/** @param event - Public attachment download intent. */
function action(event: QuireKitAttachmentActionDetails): void {
  const resource=resources.value.find(item=>item.id===event.attachmentId);
  if(resource && event.action==="download")download(resource);
}
/** @param event - In reading mode a file reference directly opens its original download. */
function click(event: MouseEvent): void {
  if(props.editable || !(event.target instanceof Element) || event.target.closest("button,input,a,[data-rich-interactive]"))return;
  const id=event.target.closest<HTMLElement>("[data-attachment-id]")?.dataset.attachmentId;
  const resource=resources.value.find(item=>item.id===id);if(resource)download(resource);
}
/** @param value - One direct toolbar action. */
function execute(value: string): void {
  if(value==="download"){for(const resource of resources.value)download(resource);return;}
  const editor=props.surface.editor,pos=props.surface.position();
  if(!props.editable||!editor.isEditable||pos===undefined||editor.state.doc.nodeAt(pos)!==props.node)return;
  if(value.startsWith("view:"))editor.commands.setBlockAttachmentView(pos,props.node,value.slice(5) as BlockAttachmentView);
  else if(value==="edit")openRichContent(editor,"attachment",undefined,pos);
  else if(value==="delete")editor.chain().closeHistory().deleteRange({from:pos,to:pos+props.node.nodeSize}).run();
}
</script>
<template>
  <span class="qk-rich-object qk-attachment-object" :data-attachment-view="mode">
    <ObjectToolbar :surface="surface" :label="t('附件快捷工具')" :items="localize(tools)" @execute="execute($event.value)" />
    <span class="qk-rich-object__body qk-attachment-object__body" @click="click">
      <span v-if="inline" class="qk-attachment-references" role="group" :aria-label="t('文档附件')">
        <component :is="editable ? 'span' : 'a'" v-for="item in localize(fileItems)" :key="item.id"
          class="qk-attachment-reference" :data-attachment-id="item.id" :title="item.name"
          :href="editable ? undefined : item.url" :download="editable ? undefined : item.name"
          :target="editable ? undefined : '_blank'" :rel="editable ? undefined : 'noopener noreferrer'">
          <QuireFileIcon class="qk-attachment-reference__icon" :name="item.name" :media-type="item.mediaType" :size="12" />
          <span class="qk-attachment-reference__name" dir="auto">{{ item.name }}</span>
        </component>
      </span>
      <QuireAttachments v-else :items="localize(fileItems)" :label="t('文档附件')" layout="list" :preview="false" @action="action" />
    </span>
    <span v-if="!inline&&node.attrs.caption" class="qk-rich-caption">{{node.attrs.caption}}</span>
  </span>
</template>
