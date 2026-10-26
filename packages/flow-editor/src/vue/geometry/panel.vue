<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, reactive, ref, watch } from "vue";
import { QuireButton, QuireField, QuireInputNumber, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { FlowchartGeometryField, FlowchartGeometryPatch } from "@quirekit/flowchart";
import type { FlowFormattingContext, FlowGeometryIntent } from "../formatting/types";

const { t } = useFlowMessages();
const props = defineProps<{
  /** Shared Toolbar popup, identity and public command context. */ scope: QuireKitToolbarRendererScope;
}>();
const context = computed(() => props.scope.context as FlowFormattingContext);
const owner = context.value.editor!, snapshot = owner.getGeometry();
const fields: readonly { key: FlowchartGeometryField; label: string; min: number; max: number }[] = [
  { key: "x", label: "X 坐标", min: -1e6, max: 1e6 }, { key: "y", label: "Y 坐标", min: -1e6, max: 1e6 },
  { key: "width", label: "宽度", min: 20, max: 10000 }, { key: "height", label: "高度", min: 20, max: 10000 },
  { key: "rotation", label: "旋转角度", min: 0, max: 359.999999 },
];
const values = reactive(Object.fromEntries(fields.map(f => [f.key, snapshot.values[f.key] === null ? "" : String(snapshot.values[f.key])])) as Record<FlowchartGeometryField, string>);
const changed = ref(new Set<FlowchartGeometryField>());
/** @param field - Edited property. */
function touch(field: FlowchartGeometryField): void { changed.value = new Set([...changed.value, field]); }
/** @param field - Numeric contract. @returns Whether an explicitly edited field is finite and inside its range. */
function invalid(field: typeof fields[number]): boolean {
  const value = values[field.key], number = Number(value);
  return changed.value.has(field.key) && (!value.trim() || !Number.isFinite(number) || number < field.min || number > field.max);
}
const valid = computed(() => !fields.some(invalid));
/** Dispatches only explicit draft fields to the controller that opened this panel. */
function apply(): void {
  if (!valid.value || !changed.value.size || props.scope.disabled || owner !== context.value.editor) return;
  const patch = Object.fromEntries([...changed.value].map(key => [key, Number(values[key])])) as FlowchartGeometryPatch;
  props.scope.execute({ kind: "geometry", editor: owner, expected: snapshot, patch } satisfies FlowGeometryIntent);
}
watch([() => context.value.editor, () => JSON.stringify(context.value.state.selectedIds), () => props.scope.disabled, () => context.value.contentVersion], () => props.scope.setExpanded(false), { flush: "sync" });
</script>

<template>
  <form class="qk-flow-geometry" :aria-label="t('位置与尺寸')" @submit.prevent="apply">
    <strong>{{ t('位置与尺寸') }}<span>{{ t('{count} 个图形', { count: snapshot.count }) }}</span></strong>
    <div class="qk-flow-geometry__fields">
      <QuireField v-for="field in fields" :key="field.key" :label="t(field.label)" width="100%" :disabled="scope.disabled || !snapshot.editable[field.key]" :mixed="snapshot.values[field.key] === null && !changed.has(field.key)" :mixed-text="t('多个值')" :invalid="invalid(field)" :error-text="t('请输入有效范围内的数值')">
        <template #meta>{{ field.key === "rotation" ? "°" : "px" }}</template>
        <template #default="{ controlProps }">
        <QuireInputNumber v-bind="controlProps" v-model="values[field.key]" :label="t(field.label)" width="100%" :placeholder="t('混合')" :min="field.min" :max="field.max" :step="1" :small-step="0.1" :large-step="10" :clamp-value-on-blur="false" @update:model-value="touch(field.key)" />
        </template>
      </QuireField>
    </div>
    <p>{{ t('坐标为画布位置；宽高按旋转前的图形计算。仅应用已修改的字段。') }}</p>
    <div class="qk-flow-geometry__actions">
      <QuireButton variant="text" @click="scope.setExpanded(false)">{{ t('取消') }}</QuireButton>
      <QuireButton type="submit" color="primary" variant="solid" :disabled="scope.disabled || !valid || !changed.size">{{ t('应用属性') }}</QuireButton>
    </div>
  </form>
</template>
<style scoped>
.qk-flow-geometry { display: grid; gap: var(--qk-space-group); width: 292px; max-width: 100%; min-width: 0; }
.qk-flow-geometry strong { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
.qk-flow-geometry strong span, .qk-flow-geometry p { font-size: 12px; font-weight: 400; color: var(--qk-color-text-secondary); }
.qk-flow-geometry__fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--qk-space-inline); }
.qk-flow-geometry p { margin: 0; }
.qk-flow-geometry__actions { display: flex; justify-content: flex-end; gap: var(--qk-space-inline); }
</style>
