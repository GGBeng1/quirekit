<script setup lang="ts">
import { useBlockLocale } from "@quirekit/block-editor/vue";
import { computed, ref } from "vue";
import { QuireColorPicker, QuireIcon, QuireToolbarColorPickerDisclosure, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { BlockTableToolbarContext } from "./types";

const { t } = useBlockLocale();
const props = defineProps<{ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as BlockTableToolbarContext);
const draft = ref("#DBEAFE"), recent = ref<string[]>([]);
/** @param color - Explicit opaque hex value from the shared palette, or null for no fill. */
function apply(color: string | null): void {
  const { editor, target } = context.value;
  if (!editor.isEditable || editor.state.doc !== target.doc || (color !== null && !/^#[\da-f]{6}$/i.test(color))) return;
  if (editor.commands.setWordTableCellAttrs({ tablePos: target.tablePos, ...target.rect, attrs: { shading: color ? { fill: color.slice(1).toUpperCase(), pattern: "clear", color: "auto" } : null } })) {
    if (color) recent.value = [color, ...recent.value.filter(item => item !== color)].slice(0, 8);
    editor.commands.focus();
  }
}
</script>
<template>
  <QuireColorPicker v-model="draft" :label="t('单元格底色')" :open="scope.expanded" :show-alpha="false" :recent-colors="recent" :reset-label="t('无底色')"
    @update:open="scope.setExpanded($event === true)" @commit="apply" @reset="apply(null)">
    <template #trigger><QuireToolbarColorPickerDisclosure :label="t('单元格底色')"><QuireIcon name="fillColor" :accent-color="draft" /></QuireToolbarColorPickerDisclosure></template>
  </QuireColorPicker>
</template>
