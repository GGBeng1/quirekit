<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { onBeforeUnmount, shallowRef, ref, watch } from "vue";
import type { Editor } from "@quirekit/core";
import { EditorUIAnchoredOverlay } from "@quirekit/editor-ui/vue";
import { QuireCard, QuireEmojiPicker, QuireOverlayProvider } from "@quirekit/ui/vue";
import { registerBlockContainerRenderer } from "../../containers/registry";
import { createBlockContainerSurface } from "../../containers/surface";
import type { BlockContainerAttributes, BlockContainerSurface } from "../../containers/types";
import { registerContainerMenu } from "./menu";
import type { BlockContainerEntry } from "./types";
import { useBlockContainerContext } from "./context";
import Controls from "./controls.vue";
import ContainerForm from "./form.vue";

const { t } = useBlockLocale();
const props = defineProps<{ /** Canonical owner. */ editor: Editor; /** Live permission. */ editable: boolean }>();
const entries = shallowRef<readonly BlockContainerEntry[]>([]), surface = ref<HTMLElement>();
const { target, anchor, measure, close } = useBlockContainerContext(props.editor, surface);
let sequence = 0;
const surfaces = new Map<unknown, BlockContainerSurface>();
const releaseMenu = registerContainerMenu(props.editor, surfaces);
const release = registerBlockContainerRenderer(props.editor, context => {
  const mounted = createBlockContainerSurface(context, () => { entry.state.value = mounted.snapshot(); }, () => { surfaces.delete(mounted.dom); entries.value = entries.value.filter(item => item !== entry); });
  surfaces.set(mounted.dom, mounted);
  mounted.header.replaceChildren();
  const entry: BlockContainerEntry = { key: ++sequence, surface: mounted, state: shallowRef(mounted.snapshot()) };
  entries.value = [...entries.value, entry]; return mounted;
});
watch(() => props.editable, () => { close(); for (const entry of entries.value) entry.surface.syncEditable(); });
/** @param attrs - User-approved presentation change. */
function apply(attrs: Partial<BlockContainerAttributes>): void {
  const source = target.value;
  if (source && props.editor.state.doc === source.doc && props.editor.commands.updateBlockContainer({ position: source.position, expected: source.node, attrs })) close(true);
}
/** @param remove - Whether to delete the whole block instead of preserving its children. */
function dissolve(remove = false): void {
  const source = target.value;
  if (!source || !props.editor.isEditable || props.editor.state.doc !== source.doc) return;
  const applied = remove ? props.editor.chain().closeHistory().deleteRange({ from: source.position, to: source.position + source.node.nodeSize }).run()
    : props.editor.commands.unwrapBlockContainer(source.position);
  if (applied) close(true);
}
onBeforeUnmount(() => { releaseMenu(); release(); for (const entry of entries.value) entry.surface.destroy(); surfaces.clear(); });
</script>
<template>
  <Teleport v-for="entry in entries" :key="entry.key" :to="entry.surface.header"><Controls :editor="editor" :surface="entry.surface" :state="entry.state.value" /></Teleport>
  <EditorUIAnchoredOverlay :show="!!target" :anchor="anchor" :resolve-anchor="measure" placement="bottom-start">
    <div ref="surface" class="qk-block-container-popup" data-block-container-popup>
      <QuireOverlayProvider :target="surface" strategy="absolute">
        <QuireCard v-if="target" class="qk-block-container-popup__surface" variant="raised" density="compact" role="dialog" :aria-label="t(target.mode === 'emoji' ? t('高亮块表情') : t('容器设置'))">
          <QuireEmojiPicker v-if="target.mode === 'emoji'" autofocus @select="apply({ emoji: $event.value })" />
          <ContainerForm v-else :target="target" @apply="apply" @cancel="close(true)" @unwrap="dissolve()" @remove="dissolve(true)" />
        </QuireCard>
      </QuireOverlayProvider>
    </div>
  </EditorUIAnchoredOverlay>
</template>
