<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref } from "vue";
import type { Node as PMNode } from "@quirekit/pm";
import { QuireButton, QuireMediaPlayer } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { BlockResource, RichContentSurface, RichContentKind } from "../../rich-content/types";
import { openRichContent } from "../../rich-content/tasks";
import MediaPreview from "../media/gallery/preview.vue";
import { collectBlockMediaGallery } from "../media/gallery/items";
import type { BlockMediaGallery } from "../media/gallery/types";
import ObjectToolbar from "../objects/toolbar.vue";

const { t, localize } = useBlockLocale();
const props=defineProps<{/** Stable mount. */ surface:RichContentSurface;/** Accepted node. */ node:PMNode;/** Live permission. */ editable:boolean}>();
const attrs=computed(()=>props.node.attrs),gallery=computed(()=>props.node.type.name==="imageGallery");
const resources=computed(()=>attrs.value.items as BlockResource[]??[]),preview=ref<BlockMediaGallery|null>(null);
const objectLabel=computed(()=>gallery.value?'多图':attrs.value.kind==='audio'?'音频':attrs.value.kind==='video'?'视频':'附件');
const tools=computed<readonly QuireKitToolbarEntry[]>(()=>[
  ...(props.editable?[{value:'edit',label:t('编辑{kind}', { kind: t(objectLabel.value) }),icon:'edit'}]:[]),
  ...(!gallery.value&&resources.value[0]&&attrs.value.kind!=='attachment'?[{value:'download',label:'下载文件',icon:'download'}]:[]),
  ...(props.editable?[{value:'delete',label:t('删除{kind}', { kind: t(objectLabel.value) }),icon:'trash2'}]:[])
]);
/** Opens the exact block's existing authoring workflow. */
function edit():void {
  const kind:RichContentKind=gallery.value?"imageGallery":attrs.value.kind;
  openRichContent(props.surface.editor,kind,undefined,props.surface.position());
}
/** @param resource - User-requested original resource. */
function download(resource:BlockResource):void {
  const link=props.surface.dom.ownerDocument.createElement("a");link.href=resource.src;link.download=resource.name;link.target="_blank";link.rel="noopener noreferrer";link.click();
}
/** @param index - Image ordinal inside this gallery. */
function viewImage(index:number):void {
  const position=props.surface.position();if(position!==undefined)preview.value=collectBlockMediaGallery(props.surface.editor,position,index);
}
/** @param value - Intent from the same public toolbar used by image objects. */
function execute(value:string):void {
  if(value==='download'&&resources.value[0])download(resources.value[0]);
  else if(props.editable&&props.surface.editor.isEditable) {
    if(value==='edit')edit();
    if(value==='delete') {
      const pos=props.surface.position(),editor=props.surface.editor;
      if(pos!==undefined&&editor.state.doc.nodeAt(pos)===props.node)editor.chain().closeHistory().deleteRange({from:pos,to:pos+props.node.nodeSize}).run();
    }
  }
}
</script>
<template>
  <div class="qk-rich-object">
    <ObjectToolbar :surface="surface" :label="t('{kind}快捷工具', { kind: t(objectLabel) })" :items="localize(tools)" @execute="execute($event.value)" />
    <div class="qk-rich-object__body">
    <template v-if="gallery">
      <div class="qk-rich-image-grid" :style="{'--qk-gallery-columns':attrs.columns}">
        <QuireButton v-for="(item,index) in resources" :key="item.id" variant="ghost" class="qk-rich-image" :aria-label="t('查看图片：{name}', { name: item.name })" @click="viewImage(index)">
          <img :src="item.src" :alt="item.alt||item.name" loading="lazy" @error="($event.target as HTMLImageElement).dataset.failed='true'" />
        </QuireButton>
      </div>
    </template>
    <template v-else-if="attrs.kind==='audio'||attrs.kind==='video'">
      <QuireMediaPlayer v-if="resources[0]" data-rich-interactive :kind="attrs.kind" :src="resources[0].src" :title="resources[0].name" />
    </template>
    </div>
    <p v-if="attrs.caption" class="qk-rich-caption">{{attrs.caption}}</p>
  </div>
  <MediaPreview v-if="preview" :editor="surface.editor" :gallery="preview" @close="preview=null" />
</template>
