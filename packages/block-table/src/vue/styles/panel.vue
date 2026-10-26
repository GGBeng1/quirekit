<script setup lang="ts">
import { computed } from "vue";
import { useBlockLocale } from "@quirekit/block-editor/vue";
import { QuireCheckbox, QuirePresetGallery, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { createWordTableStylePreview, resolveWordTableStyleRegistry, installWordTableStyleDefinition } from "@quirekit/classic-table-model";
import { blockTableStyleChoices, blockTableStyleIds, blockTableStyleRegistry } from "../../styles/presets";
import { applyBlockTableStyle, readBlockTableLook } from "../../styles/commands";
import type { BlockTableHeading, BlockTableStyle } from "../../styles/types";
import type { BlockTableToolbarContext } from "../types";
import Preview from "./preview.vue";

const props = defineProps<{ scope: QuireKitToolbarRendererScope }>();
const { t } = useBlockLocale();
const context = computed(() => props.scope.context as BlockTableToolbarContext);
const table = computed(() => context.value.target.doc.nodeAt(context.value.target.tablePos)!);
const look = computed(() => readBlockTableLook(table.value));
const selected = computed(() => blockTableStyleChoices.find(item => blockTableStyleIds[item.value] === table.value.attrs.tableStyle)?.value
  ?? (table.value.attrs.tableStyle === "TableGrid" ? "grid" : null));
const items = computed(() => blockTableStyleChoices.map(item => ({ value: item.value, label: t(item.label) })));
const previews = computed(() => {
  let registry = resolveWordTableStyleRegistry(context.value.target.doc.attrs.wordTableStyleRegistry);
  for (const definition of Object.values(blockTableStyleRegistry.styles)) {
    if (!registry.styles[definition.id]) registry = installWordTableStyleDefinition(registry, definition);
  }
  return new Map(blockTableStyleChoices.map(item => [item.value, createWordTableStylePreview(context.value.editor.schema,
    registry, blockTableStyleIds[item.value], { ...look.value, bandedRows: item.value === "banded" }, 4, 3)]));
});
/** @param value - Selected preset key. */
function apply(value: string): void {
  const { editor, target } = context.value;
  if (applyBlockTableStyle(editor, target, value as BlockTableStyle)) { props.scope.setExpanded(false); editor.commands.focus(); }
}
/** @param key - Position-based emphasis. @param checked - Requested switch state. */
function heading(key: BlockTableHeading, checked: boolean): void {
  context.value.heading?.(key, checked);
}
</script>
<template>
  <div data-block-table-style-panel style="display:grid;gap:var(--qk-space-surface);width:min(320px,calc(100vw - 64px))">
    <QuirePresetGallery :label="t('表格风格')" hide-label :items="items" :model-value="selected" :max-columns="3" min-item-width="88px" @select="apply">
      <template #preview="{ item }"><Preview :preview="previews.get(item.value as BlockTableStyle)!" :label="item.label" /></template>
    </QuirePresetGallery>
    <div style="display:flex;flex-wrap:wrap;gap:var(--qk-space-group);padding-top:var(--qk-space-surface);border-top:1px solid var(--qk-color-border-subtle)">
      <QuireCheckbox :label="t('表头行')" :checked="look.firstRow" @update:checked="heading('firstRow', $event === true)" />
      <QuireCheckbox :label="t('标题列')" :checked="look.firstColumn" @update:checked="heading('firstColumn', $event === true)" />
    </div>
  </div>
</template>
