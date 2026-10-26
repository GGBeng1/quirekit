<script setup lang="ts">
import { useFlowMessages } from "./messages";
import { computed, reactive, ref, watch } from "vue";
import { QuireButton, QuireCollapsible, QuireInput, QuireTooltipContent, QuireTooltipRoot, QuireTooltipTrigger } from "@quirekit/ui/vue";
import type { FlowchartShape } from "@quirekit/flowchart";
import { flowShapeGroups } from "../ui/shapes";

const { t } = useFlowMessages();
defineProps<{ disabled: boolean }>();
const emit = defineEmits<{ insert: [shape: FlowchartShape]; drag: [shape: FlowchartShape, event: PointerEvent] }>();
const query = ref(""), collapsed = reactive<Record<string, boolean>>({}), searchCollapsed = reactive<Record<string, boolean>>({});
watch(query, () => { for (const key of Object.keys(searchCollapsed)) delete searchCollapsed[key]; });
const groups = computed(() => {
  const search = query.value.trim().toLocaleLowerCase();
  return flowShapeGroups.map(group => ({ ...group, shapes: group.shapes.filter(item => `${t(item.label)} ${item.label} ${item.shape}`.toLocaleLowerCase().includes(search)) })).filter(group => group.shapes.length);
});
</script>

<template>
  <aside class="qk-flow-editor__palette" :aria-label="t('图形库')">
    <QuireInput v-model="query" :aria-label="t('搜索图形')" :placeholder="t('搜索图形')" width="100%" clearable />
    <div class="qk-flow-editor__palette-groups">
      <QuireCollapsible v-for="group in groups" :key="group.label" :title="t(group.label)" variant="plain" class="qk-flow-editor__shape-group"
        :open="!(query.trim() ? searchCollapsed : collapsed)[group.label]" @update:open="(query.trim() ? searchCollapsed : collapsed)[group.label] = !$event">
        <template #trigger><span class="qk-flow-editor__group-label">{{ t(group.label) }}<span aria-hidden="true">{{ group.shapes.length }}</span></span></template>
        <div class="qk-flow-editor__shapes">
          <QuireTooltipRoot v-for="item in group.shapes" :key="item.shape" placement="right">
            <QuireTooltipTrigger as-child>
              <QuireButton :aria-label="t('插入{label}', { label: t(item.label) })" variant="ghost" size="sm" :disabled="disabled" class="qk-flow-editor__shape" @pointerdown="emit('drag', item.shape, $event)" @dragstart.prevent @click="emit('insert', item.shape)">
                <svg :viewBox="item.viewBox" aria-hidden="true"><path :d="item.outline" /><path v-if="item.detail" :d="item.detail" class="qk-flow-editor__shape-detail" /></svg>
              </QuireButton>
            </QuireTooltipTrigger>
            <QuireTooltipContent :content="t(item.label)" />
          </QuireTooltipRoot>
        </div>
      </QuireCollapsible>
    </div>
    <p v-if="!groups.length" class="qk-flow-editor__palette-hint" role="status">{{ t('没有匹配的图形') }}</p>
    <p v-else class="qk-flow-editor__palette-hint">{{ t('拖动图形到画布 · 点击居中添加') }}</p>
  </aside>
</template>
