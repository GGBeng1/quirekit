<script setup lang="ts">
import { useFormulaLayout } from './use-layout';
import type { FormulaSvgProps } from './types';
import { useMathUiText } from '../locale';
const props = withDefaults(defineProps<FormulaSvgProps>(), { visible: true });
const text = useMathUiText();
const { layout, ready, error, layouts } = useFormulaLayout(() => props.document, { visible: () => props.visible !== false });
</script>
<template>
  <span class="qk-math-svg" :style="layout ? { width: `${layout.width}em`, height: `${layout.height}em` } : undefined" :data-ready="ready" :data-layouts="layouts" :aria-label="error ? text.messages.unrenderable : undefined" v-html="layout?.svg ?? ''" />
</template>
<style>
.qk-math-svg { display:inline-flex;align-items:center;justify-content:center; }
.qk-math-svg > svg { display:block;flex:none; }
</style>
