<script setup lang="ts">
import { QuireButton, QuireTooltipContent, QuireTooltipRoot, QuireTooltipTrigger } from '@quirekit/ui/vue';
import type { FormulaChoiceProps } from './types';
import FormulaSvg from '../rendering/svg.vue';
import { useMathUiText } from '../locale';
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<FormulaChoiceProps>(), { visible: true });
const text = useMathUiText();
const emit = defineEmits<{ /** Inserts this visual command. */ choose: [] }>();
</script>
<template>
  <QuireTooltipRoot>
    <QuireTooltipTrigger as-child>
      <QuireButton size="sm" variant="ghost" :aria-label="text.name(props)" :disabled="disabled" class="qk-math-choice" :style="{ height: 'auto' }" :class="{ 'is-current': current, 'is-wide': wide, 'is-compact': compact }" @mousedown.prevent @click="emit('choose')">
        <FormulaSvg class="qk-math-choice__preview" aria-hidden="true" :document="props.document" :visible="props.visible" />
      </QuireButton>
    </QuireTooltipTrigger>
    <QuireTooltipContent :content="text.name(props)" />
  </QuireTooltipRoot>
</template>
<style>
.qk-math-choice { width:100%;height:auto;min-width:0;min-height:64px;padding:var(--qk-space-surface-compact) var(--qk-space-inline); }
.qk-math-choice.is-compact { min-height:var(--qk-control-touch-target);padding:var(--qk-space-inline); }
.qk-math-choice.is-current { background:var(--qk-color-surface-selected); }
.qk-math-choice__preview { display:grid;place-items:center;font-size:var(--qk-math-preview-size,20px);pointer-events:none; }
.qk-math-choice.is-wide .qk-math-choice__preview { font-size:16px; }
</style>
