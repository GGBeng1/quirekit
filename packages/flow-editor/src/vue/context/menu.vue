<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { localizeFlowEntries } from "../../locale/projection";
import { computed, nextTick, watch } from "vue";
import { QuireMenu } from "@quirekit/ui/vue";
import type { FlowchartPoint } from "@quirekit/flowchart";
import type { FlowchartEditor, FlowchartEditorState } from "@quirekit/flowchart-x6";
import { flowContextItems } from "../../ui/context";

const { t, locale } = useFlowMessages();
const props = defineProps<{
  /** Controller that resolved the hit. */ editor: FlowchartEditor;
  /** Lightweight selection and permissions. */ state: FlowchartEditorState;
  /** Viewport CSS anchor. */ point: FlowchartPoint;
}>();
const emit = defineEmits<{
  /** Dismisses this menu. */ close: [];
  /** Shared workspace intent. */ execute: [value: string];
}>();
const owner = props.editor, selection = JSON.stringify(props.state.selectedIds);
const items = computed(() => localizeFlowEntries(flowContextItems(props.state), locale.value));
watch([() => props.editor, () => JSON.stringify(props.state.selectedIds), () => props.state.readOnly, () => props.state.composing], () => emit("close"), { flush: "sync" });
/** @param value - Public menu intent, guarded against another selection or instance. */
function execute(value: string): void {
  if (owner !== props.editor || selection !== JSON.stringify(owner.getState().selectedIds) || props.state.composing) return;
  emit("execute", value);
}
/** @param open - Public menu dismissal. Keeps deliberate outside focus changes. */
function changed(open: boolean | undefined): void {
  if (open) return;
  const active = document.activeElement, restore = !active || active === document.body || !!active.closest('[role="menu"]');
  emit("close");
  void nextTick(() => { if (restore && (!document.activeElement || document.activeElement === document.body)) owner.focus(); });
}
</script>

<template>
  <QuireMenu :open="true" :anchor-point="point" :items="items" :aria-label="t('图形操作')" width="250px" initial-focus="menu" @update:open="changed" @select="execute" />
</template>
