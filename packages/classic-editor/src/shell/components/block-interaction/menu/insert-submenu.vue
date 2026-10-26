<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import { QuireIcon, QuireMenuSubmenu } from "@quirekit/ui/vue";
import type { ClassicEditorBlockInsertionTarget } from "@classic/types";
import InsertPanel from "../insert/panel.vue";
import type { ClassicEditorShellModel } from "../../../types";
import { useClassicEditorOverlay } from "../../../overlays/registry";
import type { useBlockTypes } from "../use-block-types";

const props = defineProps<{
  /** Current editor and locale. */
  model: ClassicEditorShellModel;
  /** Parent block surface, including its captured selection. */
  parentId: string;
  /** Boundary outside the complete selected range. */
  side: "before" | "after";
  /** Feature-owned insertion presets. */
  items: ReturnType<typeof useBlockTypes>["types"]["value"];
  /** Captures the whole selected range outside edge on opening. */
  resolveTarget: (side: "before" | "after") => ClassicEditorBlockInsertionTarget | null;
  /** Shared document overlay portal. */
  portalTarget: HTMLElement;
}>();
const emit = defineEmits<{
  /** One accepted insertion choice. */
  close: [];
}>();
const visible = ref(false);
const target = shallowRef<ClassicEditorBlockInsertionTarget | null>(null);
const owner = useClassicEditorOverlay("block-insert", visible, undefined,
  { resolveRoot: () => props.model.context?.root },
  { resolveParentId: () => props.parentId, dismissOnEscape: () => false, dismissOnOutsidePointer: () => false });
const contentProps = computed(() => ({ ...owner.ownerAttributes, lang: props.model.locale,
  style: { transitionProperty: "opacity" }, "data-block-insert": props.side }));
/** @param open - Public submenu visibility. */
function setOpen(open: boolean): void {
  if (open) target.value = props.resolveTarget(props.side);
  owner.setVisible(open && target.value !== null);
}
</script>

<template>
  <QuireMenuSubmenu :open="visible" width="240px" @update:open="setOpen($event === true)" :content-props="contentProps">
    <template #leading><QuireIcon :name="side === 'before' ? 'arrowUp' : 'arrowDown'" style="color: var(--qk-color-action-text)" /></template>
    <template #trigger>{{ model.locale === 'en' ? (side === 'before' ? 'Insert above' : 'Insert below') : (side === 'before' ? '上方插入' : '下方插入') }}</template>
    <InsertPanel v-if="visible && target" :model="model" :target="target" :types="items"
      :parent-id="owner.ownerAttributes['data-qk-classic-overlay']" :portal-target="portalTarget" @close="emit('close')" />
  </QuireMenuSubmenu>
</template>
