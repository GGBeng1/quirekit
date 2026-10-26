<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type { Editor } from "@quirekit/core";
import { QuireCommandList, QuireFileIcon, QuirePopoverRoot, QuirePopoverAnchor, QuirePopoverContent, QuireScrollArea, type QuireKitCommandListHandle } from "@quirekit/ui/vue";
import { useEditorUIOverlayHost } from "@quirekit/editor-ui/vue";
import { collectAttachmentReferences, insertAttachmentReference, readAttachmentQuery } from "../../attachments/references";
import type { BlockAttachmentQuery } from "../../attachments/types";
import type { BlockResource } from "../../rich-content/types";
import { suspendBlockObjectToolbars } from "../objects/ownership";

const { t, localize } = useBlockLocale();
const props = defineProps<{ /** Document session. */ editor: Editor; /** Native input boundary. */ root: HTMLElement }>();
const overlay = useEditorUIOverlayHost(), target = shallowRef<BlockAttachmentQuery|null>(null);
const files = shallowRef<readonly BlockResource[]>([]), focusOwner = shallowRef<HTMLElement|null>(null);
const anchor = shallowRef<{x:number;y:number}|null>(null), list = ref<QuireKitCommandListHandle>();
const results = computed(() => {
  const query = target.value?.query.trim().toLocaleLowerCase() ?? "";
  return files.value.filter(item => item.name.toLocaleLowerCase().includes(query) || item.src.toLocaleLowerCase().includes(query)).slice(0, 30);
});
const commands = computed(() => results.value.map(item => ({ key:item.id, label:item.name, group:"当前文档附件" })));
const open = computed(() => !!target.value && !!anchor.value);
let composing = false, dismissed: BlockAttachmentQuery|null = null;
let releaseGeometry: (()=>void)|undefined, releaseTools: (()=>void)|undefined;
/** Reads a bounded caret context; the file inventory is collected once per open task. */
function sync(): void {
  if (composing) return;
  const next = readAttachmentQuery(props.editor), input = props.root.ownerDocument.activeElement;
  if (!next || dismissed?.doc===next.doc && dismissed.from===next.from || !(input instanceof HTMLElement) || !props.root.contains(input)) {
    target.value=null; anchor.value=null; return;
  }
  if (!target.value || target.value.from!==next.from) files.value=collectAttachmentReferences(next.doc);
  focusOwner.value=input; target.value=next;
}
/** Projects only while the explicit picker is open, after View reconciliation. */
function project(): void {
  if (!target.value || props.editor.isDestroyed) return;
  const coords=props.editor.view.coordsAtPos(target.value.to); anchor.value={x:coords.left,y:coords.bottom};
}
/** Binds the current mounted geometry authority. */
function bindGeometry(): void { releaseGeometry?.(); releaseGeometry=props.editor.mountedView?.onGeometryUpdate?.(project); }
/** Explicit dismissal preserves typed text. */
function close(): void { dismissed=target.value; target.value=null; anchor.value=null; }
/** Ends transient state before its View disappears. */
function unmount(): void { releaseGeometry?.(); releaseGeometry=undefined; close(); }
/** @param key - Existing resource identity chosen with pointer or keyboard. */
async function choose(key: string): Promise<void> {
  const source=target.value, resource=results.value.find(item=>item.id===key);
  close();
  if (source && resource && insertAttachmentReference(props.editor,source,resource)) {
    props.editor.commands.closeHistory(); await nextTick(); props.editor.commands.focus();
  }
}
/** @param event - Native key before document editing; IME and modified keys remain untouched. */
function keydown(event: KeyboardEvent): void {
  if (!open.value || composing || event.isComposing || event.keyCode===229 || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key==="Escape") {event.preventDefault();event.stopPropagation();close();return;}
  if(list.value?.handleKeydown(event))event.stopPropagation();
}
/** Suspends suggestion acceptance during composition. */
function compositionStart(): void { composing=true; }
/** Waits for the committed input transaction before reading the query. */
function compositionEnd(): void { composing=false;void nextTick(sync); }
watch(open,value=>{releaseTools?.();releaseTools=value?suspendBlockObjectToolbars(props.editor):undefined;});
onMounted(()=>{
  bindGeometry(); props.editor.on("mount",bindGeometry);props.editor.on("unmount",unmount);props.editor.on("transaction",sync);
  props.root.addEventListener("keydown",keydown,true);props.root.addEventListener("compositionstart",compositionStart,true);props.root.addEventListener("compositionend",compositionEnd,true);
});
onBeforeUnmount(()=>{
  unmount();releaseTools?.();props.editor.off("mount",bindGeometry);props.editor.off("unmount",unmount);props.editor.off("transaction",sync);
  props.root.removeEventListener("keydown",keydown,true);props.root.removeEventListener("compositionstart",compositionStart,true);props.root.removeEventListener("compositionend",compositionEnd,true);
});
</script>
<template>
  <QuirePopoverRoot v-if="open&&anchor" :open="true" :auto-focus="false" :restore-focus="false" placement="bottom-start" @update:open="!$event&&close()">
    <QuirePopoverAnchor><span aria-hidden="true" class="qk-block-slash-anchor" :style="{left:`${anchor.x}px`,top:`${anchor.y}px`}" /></QuirePopoverAnchor>
    <QuirePopoverContent :portal-target="overlay?.host.value??'body'" width="320px" max-width="calc(100vw - 32px)" :show-arrow="false" padding="none" border="subtle" :aria-label="t('引用附件')">
      <QuireScrollArea class="qk-attachment-mentions">
        <QuireCommandList v-if="commands.length" ref="list" :label="t('文档附件')" :items="localize(commands)" :focus-owner="focusOwner" @select="choose">
          <template #leading="{index}"><QuireFileIcon :name="results[index]!.name" :media-type="results[index]!.mime" :size="20" /></template>
        </QuireCommandList>
        <p v-else role="status" class="qk-block-insert-message">{{files.length?t('没有找到匹配的附件'):t('文档中还没有附件')}}</p>
      </QuireScrollArea>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
