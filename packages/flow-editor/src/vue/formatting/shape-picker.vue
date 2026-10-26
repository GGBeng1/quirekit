<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, ref, watch } from "vue";
import { QuireButton, QuireInput, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { canReplaceFlowchartShape, type FlowchartShape } from "@quirekit/flowchart";
import { flowShapeGroups } from "../../ui/shapes";
import type { FlowFormattingContext, FlowShapeIntent } from "./types";

const { t } = useFlowMessages();
const props = defineProps<{ /** Public toolbar popup and neutral controller. */ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as FlowFormattingContext), query = ref("");
const owner = context.value.editor!, expected = owner.getGeometry();
const selected = new Set(context.value.state.selectedShapes);
const groups = computed(() => flowShapeGroups.map(group => ({ ...group, shapes: group.shapes.filter(item => canReplaceFlowchartShape(item.shape)
  && `${t(item.label)} ${item.label} ${item.shape}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())) })).filter(group => group.shapes.length));
/** @param shape - Chosen ordinary silhouette. */
function apply(shape: FlowchartShape): void {
  if (props.scope.disabled || owner !== context.value.editor) return;
  props.scope.execute({ kind: "shape", editor: owner, expected, shape } satisfies FlowShapeIntent);
  props.scope.setExpanded(false);
}
watch([() => context.value.editor, () => JSON.stringify(context.value.state.selectedIds), () => props.scope.disabled, () => context.value.contentVersion], () => props.scope.setExpanded(false), { flush: "sync" });
</script>
<template>
  <section class="qk-flow-replace" :aria-label="t('更换图形')">
    <QuireInput v-model="query" :aria-label="t('查找替换图形')" :placeholder="t('查找图形')" width="100%" clearable />
    <p>{{ t('保留文字、样式、尺寸和连线') }}</p>
    <div class="qk-flow-replace__groups">
      <section v-for="group in groups" :key="group.label">
        <h3>{{ t(group.label) }}</h3>
        <div class="qk-flow-replace__grid">
          <QuireButton v-for="item in group.shapes" :key="item.shape" variant="ghost" :aria-label="t('更换为{label}', { label: t(item.label) })" :aria-pressed="selected.size === 1 && selected.has(item.shape)" :disabled="scope.disabled" @click="apply(item.shape)">
            <span class="qk-flow-replace__choice"><svg :viewBox="item.viewBox" aria-hidden="true"><path :d="item.outline" /><path v-if="item.detail" :d="item.detail" /></svg>
            <span>{{ t(item.label) }}</span></span>
          </QuireButton>
        </div>
      </section>
      <p v-if="!groups.length" role="status">{{ t('没有匹配的图形') }}</p>
    </div>
  </section>
</template>
<style scoped>
.qk-flow-replace { width: 320px; max-width: 100%; display: grid; gap: var(--qk-space-inline); }
.qk-flow-replace p { margin: 0; font-size: 12px; color: var(--qk-color-text-secondary); }
.qk-flow-replace__groups { max-height: min(440px, 55vh); overflow: auto; }
.qk-flow-replace h3 { margin: 12px 0 6px; font-size: 12px; }
.qk-flow-replace__grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.qk-flow-replace__grid button { height: 66px; padding: 6px 2px; font-size: 11px; }
.qk-flow-replace__grid button[aria-pressed=true] { color: var(--qk-color-action-primary); background: var(--qk-color-surface-workspace); }
.qk-flow-replace__choice { display: flex; flex-direction: column; align-items: center; gap: 6px; white-space: normal; line-height: 14px; }
.qk-flow-replace svg { width: 42px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.5; overflow: visible; }
.qk-flow-replace path { vector-effect: non-scaling-stroke; }
</style>
