<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { onBeforeUnmount, ref, watch } from "vue";
import { QuireIcon, QuireIconButton } from "@quirekit/ui/vue";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import "./styles.css";

const { t } = useFlowMessages();
const props = defineProps<{ /** Neutral viewport and overview owner. */ editor: FlowchartEditor }>();
const emit = defineEmits<{ /** Dismisses the overview. */ close: [] }>();
const mount = ref<HTMLElement>(); let stop = () => {};
watch([mount, () => props.editor], ([container, editor]) => { stop(); if (container) stop = editor.mountOverview(container); }, { flush: "post" });
onBeforeUnmount(() => stop());
</script>
<template>
  <section class="qk-flow-navigation qk-flow-overview" :aria-label="t('画布缩略图')" @keydown.esc.stop.prevent="emit('close')">
    <header><strong>{{ t('缩略图') }}</strong><QuireIconButton :label="t('关闭缩略图')" variant="ghost" @click="emit('close')"><QuireIcon name="close" /></QuireIconButton></header>
    <div ref="mount" class="qk-flow-overview__surface"></div>
    <p class="qk-flow-navigation__hint">{{ t('单击定位 · 方向键平移') }}</p>
  </section>
</template>
