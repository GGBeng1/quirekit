<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, ref, watch } from "vue";
import { QuireButton, QuireField, QuireInputNumber, QuireIcon, QuireToolbar, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent } from "@quirekit/ui";
import type { FlowchartNodeStyle } from "@quirekit/flowchart";
import type { FlowFormattingContext, FlowTextIntent } from "./types";

const { t } = useFlowMessages();
const props = defineProps<{
  /** Public Toolbar-managed popup and guarded execution context. */
  scope: QuireKitToolbarRendererScope;
}>();
const context = computed(() => props.scope.context as FlowFormattingContext);
const owner = { editor: context.value.editor, selection: JSON.stringify(context.value.state.selectedIds) };
const initial = context.value.state.selectedStyle;
const fontSize = ref(initial.fontSize === null ? "" : String(initial.fontSize));
const padding = ref(initial.padding === null ? "" : String(initial.padding));
const horizontal = ref(initial.textAlign), vertical = ref(initial.verticalAlign), bold = ref(initial.bold);
const changed = ref(new Set<keyof FlowchartNodeStyle>());
/** @param key - Explicitly edited field. */
function touch(key: keyof FlowchartNodeStyle): void { changed.value = new Set([...changed.value, key]); }
const valid = computed(() => (!changed.value.has("fontSize") || fontSize.value.trim() !== "" && Number(fontSize.value) >= 10 && Number(fontSize.value) <= 72)
  && (!changed.value.has("padding") || padding.value.trim() !== "" && Number(padding.value) >= 0 && Number(padding.value) <= 80));
/** @param entries - Aligned label choices. @param active - Current common value. @returns Public toggle entries with truthful mixed state. */
function choices(entries: readonly (readonly [string, string])[], active: string | null): readonly QuireKitToolbarEntry[] {
  return entries.map(([value, label]) => ({ value, label: t(label), text: t(label), kind: "toggle", pressed: value === active }));
}
const horizontalItems = computed(() => choices([["left", "左对齐"], ["center", "居中"], ["right", "右对齐"]], horizontal.value));
const verticalItems = computed(() => choices([["top", "顶端"], ["middle", "中部"], ["bottom", "底端"]], vertical.value));
const weightItems = computed(() => choices([["normal", "常规"], ["bold", "加粗"]], bold.value === null ? null : bold.value ? "bold" : "normal"));
/** @param key - Alignment axis or weight. @param event - Local draft action. */
function choose(key: "textAlign" | "verticalAlign" | "bold", event: QuireKitToolbarExecuteEvent): void {
  if (key === "textAlign") horizontal.value = event.value as NonNullable<FlowchartNodeStyle["textAlign"]>;
  else if (key === "verticalAlign") vertical.value = event.value as NonNullable<FlowchartNodeStyle["verticalAlign"]>;
  else bold.value = event.value === "bold";
  touch(key);
}
/** Applies only the edited fields, once, to the selection that opened the panel. */
function apply(): void {
  if (!valid.value || props.scope.disabled || !owner.editor || owner.editor !== context.value.editor || owner.selection !== JSON.stringify(context.value.state.selectedIds)) return;
  const style: FlowchartNodeStyle = {
    ...(changed.value.has("fontSize") ? { fontSize: Number(fontSize.value) } : {}),
    ...(changed.value.has("padding") ? { padding: Number(padding.value) } : {}),
    ...(changed.value.has("textAlign") && horizontal.value ? { textAlign: horizontal.value } : {}),
    ...(changed.value.has("verticalAlign") && vertical.value ? { verticalAlign: vertical.value } : {}),
    ...(changed.value.has("bold") && bold.value !== null ? { bold: bold.value } : {}),
  };
  props.scope.execute({ kind: "typography", style, editor: owner.editor, selection: owner.selection } satisfies FlowTextIntent);
  props.scope.setExpanded(false);
}
watch([() => context.value.editor, () => JSON.stringify(context.value.state.selectedIds), () => props.scope.disabled], () => props.scope.setExpanded(false), { flush: "sync" });
</script>

<template>
  <form class="qk-flow-text-panel" :aria-label="t('图形文字属性')" @submit.prevent="apply">
    <div class="qk-flow-text-panel__numbers">
      <QuireField width="100%" :label="t('字号（px）')" v-slot="{ controlProps }">
        <QuireInputNumber width="100%" v-bind="controlProps" v-model="fontSize" :label="t('字号（px）')" :placeholder="t('混合')" :min="10" :max="72" :step="1" :small-step="0.5" :disabled="scope.disabled" @update:model-value="touch('fontSize')" />
      </QuireField>
      <QuireField width="100%" :label="t('内边距（px）')" v-slot="{ controlProps }">
        <QuireInputNumber width="100%" v-bind="controlProps" v-model="padding" :label="t('内边距（px）')" :placeholder="t('混合')" :min="0" :max="80" :disabled="scope.disabled" @update:model-value="touch('padding')" />
      </QuireField>
    </div>
    <QuireToolbar :label="t('字重')" :items="weightItems" align="start" @execute="choose('bold', $event)" />
    <QuireToolbar :label="t('水平对齐')" :items="horizontalItems" align="start" @execute="choose('textAlign', $event)" />
    <QuireToolbar :label="t('垂直对齐')" :items="verticalItems" align="start" @execute="choose('verticalAlign', $event)" />
    <p>{{ t('内边距在图形安全文字区域内增加留白。') }}</p>
    <QuireButton v-if="context.state.selectedIds.length === 1 && !context.state.selectedShapes.some(shape => ['image', 'group', 'er-entity', 'uml-class'].includes(shape))" variant="outline" :disabled="scope.disabled" @click="scope.execute('rich-text'); scope.setExpanded(false)"><QuireIcon name="textCursorInput" />{{ t('局部文字格式…') }}</QuireButton>
    <div class="qk-flow-text-panel__actions">
      <QuireButton variant="text" @click="scope.setExpanded(false)">{{ t('取消') }}</QuireButton>
      <QuireButton type="submit" color="primary" variant="solid" :disabled="scope.disabled || !valid || !changed.size">{{ t('应用文字样式') }}</QuireButton>
    </div>
  </form>
</template>

<style scoped>
.qk-flow-text-panel { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--qk-space-group); min-width: 0; width: 300px; max-width: 100%; }
.qk-flow-text-panel__numbers { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--qk-space-inline); }
.qk-flow-text-panel__actions { display: flex; justify-content: flex-end; gap: var(--qk-space-inline); }
.qk-flow-text-panel p { margin: 0; color: var(--qk-color-text-secondary); font-size: 12px; }
</style>
