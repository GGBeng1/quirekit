<script setup lang="ts">
import { computed } from "vue";
import { underlineStyles, type UnderlineStyle } from "@quirekit/extension-underline";
import { QuireListbox } from "@quirekit/ui/vue";
import { editorUnderlineStyleLabel } from "../../formatting/underline-copy";
import Preview from "./preview.vue";
const props = defineProps<{
  /** Product language shared with the toolbar and inspector. */
  locale: string;
  /** Uniform selected style; empty when the selection contains mixed styles. */
  modelValue: readonly string[];
  /** Styles supported by the consuming renderer; omitted for the complete native gallery. */
  styles?: readonly UnderlineStyle[];
  /** Whether the document currently accepts formatting. */
  disabled?: boolean;
}>();
defineEmits<{
  /** Explicit activation of a native underline style. */
  select: [value: string];
}>();
const items = computed(() => (props.styles ?? underlineStyles).map(value => ({ value, label: editorUnderlineStyleLabel(props.locale, value) })));
</script>
<template>
  <QuireListbox :label="locale === 'zh-CN' ? '下划线' : 'Underline'" hide-label :items="items" :model-value="[...modelValue]" :disabled="disabled"
    layout="grid" :column-count="4" content-class="qk-editor-underline-gallery" @select="$emit('select', $event)">
    <template #item="{ item }"><span class="qk-editor-underline-gallery__choice" :title="item.label"><Preview :value="item.value" /></span></template>
  </QuireListbox>
</template>
<style>
.qk-editor-underline-gallery { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--qk-space-inline-tight); }
.qk-editor-underline-gallery__choice { display: block; width: 100%; }
.qk-editor-underline-gallery .qk-editor-underline-sample { display: block; width: 100%; height: var(--qk-control-compact); }
</style>
