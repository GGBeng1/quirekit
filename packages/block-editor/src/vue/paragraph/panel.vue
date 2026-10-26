<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, reactive, ref } from "vue";
import { QuireField, QuireInputNumber, QuireButton, QuireSpace, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { BlockToolbarProps } from "../types";
import type { BlockParagraphField } from "../../paragraph/types";

const { t } = useBlockLocale();
const props = defineProps<{ /** Shared toolbar popup and selected range. */ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as BlockToolbarProps);
const fields = [
  { field: "start", label: "左侧缩进（px）", min: 0 }, { field: "end", label: "右侧缩进（px）", min: 0 },
  { field: "firstLine", label: "首行缩进（px，负值为悬挂）", min: -1000 * 4 / 3 },
  { field: "line", label: "行距（倍）", min: 0.5 },
  { field: "before", label: "段前间距（px）", min: 0 }, { field: "after", label: "段后间距（px）", min: 0 }
] as const;
/** @param field - Paragraph dimension. @returns Display value in CSS pixels, or the unitless line multiplier. */
function displayValue(field: Exclude<BlockParagraphField, "alignment">): string {
  const value = context.value.format.paragraph?.[field];
  return value == null ? "" : String(Number((Number(value) * (field === "line" ? 1 : 4 / 3)).toFixed(3)));
}
const draft = reactive(Object.fromEntries(fields.map(({ field }) => [field, displayValue(field)])));
const changed = new Set<BlockParagraphField>(), error = ref("");
const source = context.value.editor.state.pm;
/** @param field - Edited control. @param value - Local numeric text; no document write during typing. */
function update(field: BlockParagraphField, value: string): void { draft[field] = value; changed.add(field); }
/** Commits only edited fields in one undoable transaction at the captured selection. */
function apply(): void {
  const editor = context.value.editor;
  if (!editor.isEditable || editor.state.doc !== source.doc || !editor.state.pm.selection.eq(source.selection)) { error.value = "选区已变化，请重新打开段落设置"; return; }
  if (fields.some(({ field, min }) => changed.has(field) && (!draft[field]?.trim() || !Number.isFinite(Number(draft[field])) || Number(draft[field]) < min || Number(draft[field]) > (field === "line" ? 10 : 1000 * 4 / 3)))) { error.value = "请填写有效数值"; return; }
  const chain = editor.chain().closeHistory();
  // Convert only edited UI lengths; the canonical point contract and existing documents stay stable.
  for (const field of changed) chain.setBlockParagraph({ field, value: Number(draft[field]) * (field === "line" ? 1 : 3 / 4) });
  if (changed.size) chain.run();
  props.scope.setExpanded(false); editor.commands.focus();
}
</script>
<template>
  <QuireSpace orientation="vertical" gap="surfaceCompact" style="width: 280px" :aria-label="t('段落设置')">
    <QuireField v-for="item in fields" :key="item.field" :label="t(item.label)">
      <QuireInputNumber :label="t(item.label)" :model-value="draft[item.field] ?? ''" :placeholder="t('继承或混合值')" width="100%"
        :min="item.min" :max="item.field === 'line' ? 10 : 1000 * 4 / 3" :step="item.field === 'line' ? 0.25 : 1"
        @update:model-value="update(item.field, $event)" />
    </QuireField>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <QuireButton @click="apply">{{ t("应用段落设置") }}</QuireButton>
  </QuireSpace>
</template>
