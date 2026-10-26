<script setup lang="ts">
import { computed } from 'vue';
import FormulaChoice from './choice.vue';
import { useMathUiText } from '../locale';
import type { FormulaGridProps } from './types';

const props = withDefaults(defineProps<FormulaGridProps>(), { visible: true });
const text = useMathUiText();
const emit = defineEmits<{ /** Activates the original template or literal symbol identity. */ choose: [value: string] }>();
const density = computed(() => {
  const groups = new Set(props.items.map(item => item.group));
  if ([...groups].every(group => group === 'greek' || group === 'symbols')) return 'symbols';
  if (groups.has('common')) return 'presets';
  if (groups.has('sequences')) return 'sequences';
  if (groups.has('matrix')) return 'matrix';
  if (groups.has('calculus') || groups.has('operators') || groups.has('functions')) return 'structured';
  return 'basic';
});
</script>

<template>
  <div class="qk-math-grid" :data-density="density" role="group" :aria-label="label">
    <FormulaChoice v-for="(item, index) in items" :key="item.value" v-bind="item" :visible="visible" :compact="item.group === 'greek' || item.group === 'symbols'" :current="index === active" :disabled="disabled" @choose="emit('choose', item.value)" />
    <span v-if="!items.length" class="qk-math-grid__empty">{{ text.messages.noMatch }}</span>
  </div>
</template>

<style>
.qk-math-grid { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:max-content;align-content:start;gap:var(--qk-space-inline);min-height:0;overflow:auto;overscroll-behavior:contain; }
.qk-math-grid[data-density="symbols"] { grid-template-columns:repeat(6,minmax(0,1fr)); }
.qk-math-grid[data-density="structured"] { grid-template-columns:repeat(3,minmax(0,1fr)); }
.qk-math-grid[data-density="matrix"], .qk-math-grid[data-density="sequences"] { grid-template-columns:repeat(2,minmax(0,1fr)); }
.qk-math-grid[data-density="presets"] { grid-template-columns:minmax(0,1fr); }
.qk-math-grid__empty { color:var(--qk-color-text-tertiary);font-size:var(--qk-type-helper-font-size); }
@media (max-width:440px) {
  .qk-math-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .qk-math-grid[data-density="symbols"] { grid-template-columns:repeat(5,minmax(0,1fr)); }
  .qk-math-grid[data-density="structured"] { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .qk-math-grid[data-density="sequences"] { grid-template-columns:minmax(0,1fr); }
}
</style>
