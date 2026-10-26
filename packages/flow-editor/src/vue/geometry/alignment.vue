<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { localizeFlowEntries } from "../../locale/projection";
import { computed, watch } from "vue";
import { QuireIcon, QuireToolbar, QuireToolbarAction, QuireToolbarGroup, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { flowAlignmentRows } from "../../ui/arrange";
import type { FlowFormattingContext } from "../formatting/types";

const { t, locale } = useFlowMessages();

const props = defineProps<{ /** Public popup scope and current selection projection. */ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as FlowFormattingContext);
const owner = context.value.editor, selection = JSON.stringify(context.value.state.selectedIds), version = context.value.contentVersion;
const rows = computed(() => localizeFlowEntries(flowAlignmentRows(context.value.state), locale.value));
/** @param value - Existing geometry command. @param event - Public action activation. Applies only to the selection that opened this panel. */
function execute(value: string, event: MouseEvent): void {
  if (props.scope.disabled || owner !== context.value.editor || selection !== JSON.stringify(context.value.state.selectedIds) || version !== context.value.contentVersion) return;
  const item = rows.value.flatMap(row => row.items).find(item => item.value === value);
  if (!item || item.disabled) return;
  props.scope.execute(value, event);
  props.scope.setExpanded(false);
}
watch([() => context.value.editor, () => JSON.stringify(context.value.state.selectedIds), () => props.scope.disabled, () => context.value.contentVersion], () => props.scope.setExpanded(false), { flush: "sync" });
</script>

<template>
  <QuireToolbar :label="t('对齐与尺寸')" align="start" overflow="visible">
    <div class="qk-flow-alignment">
      <section v-for="row in rows" :key="row.value" class="qk-flow-alignment__section">
        <strong>{{ row.label }}</strong>
        <QuireToolbarGroup :label="row.label">
          <QuireToolbarAction v-for="item in row.items" :key="item.value" :label="item.label" v-bind="item.text === undefined ? {} : { text: item.text }"
            :disabled="scope.disabled || item.disabled === true" @activate="execute(item.value, $event)">
            <template v-if="item.icon" #default><QuireIcon :name="item.icon" /></template>
          </QuireToolbarAction>
        </QuireToolbarGroup>
        <p v-if="row.value === 'dimensions'">{{ t('采用选中图形的最大宽高') }}</p>
      </section>
    </div>
  </QuireToolbar>
</template>

<style scoped>
.qk-flow-alignment { display: grid; gap: var(--qk-space-surface-compact); min-width: 224px; max-width: 100%; }
.qk-flow-alignment__section { display: grid; gap: var(--qk-space-inline-tight); }
.qk-flow-alignment strong { color: var(--qk-color-text-secondary); font-size: 12px; font-weight: 500; }
.qk-flow-alignment p { margin: 0; color: var(--qk-color-text-secondary); font-size: 12px; font-weight: 400; }
</style>
