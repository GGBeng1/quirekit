<script setup lang="ts">
import { useMathPopupTarget } from '../popup';
import { computed, nextTick, ref, watch } from 'vue';
import { QuireInput, QuirePopoverRoot, QuirePopoverAnchor, QuirePopoverContent } from '@quirekit/ui/vue';
import FormulaGrid from '../palette/grid.vue';
import { formulaChoices, featuredFormulaIds, matchesFormula } from '../palette/catalog';
import { moveFormulaChoice } from '../palette/navigation';
import { useMathUiText } from '../locale';
const emit = defineEmits<{ /** Admitted template or literal symbol. */ choose: [value: string]; /** Cancel without editing source. */ cancel: [] }>();
const text = useMathUiText();
const content = ref<HTMLElement>();
const query = ref('');
const active = ref(0);
const choices = computed(() => formulaChoices.filter(item => query.value.trim() ? matchesFormula(item, query.value) : [...featuredFormulaIds, 'integral', 'product', 'limit', 'log-base', 'matrix-bmatrix', 'parentheses', 'symbol:π', 'symbol:∞'].includes(item.value)));
watch(query, () => { active.value = 0; });
/**
 * Focuses the search after the component-owned floating content has mounted.
 * @param element - Mounted search wrapper.
 */
function mounted(element: unknown): void {
  content.value = element as HTMLElement;
  void nextTick(() => content.value?.querySelector('input')?.focus({ preventScroll: true }));
}
/**
 * Moves a bounded command selection while leaving search text editable.
 * @param event - Keyboard event within the command palette.
 */
function keydown(event: KeyboardEvent): void {
  if (event.isComposing || event.keyCode === 229) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    active.value = moveFormulaChoice(Array.from(content.value?.querySelectorAll('.qk-math-choice') ?? []), active.value, event.key);
    void nextTick(() => content.value?.querySelectorAll('.qk-math-choice')[active.value]?.scrollIntoView({ block: 'nearest' }));
  } else if (event.key === 'Enter') {
    event.preventDefault(); const item = choices.value[active.value]; if (item) emit('choose', item.value);
  }
}
const popupTarget = useMathPopupTarget();
</script>
<template>
  <QuirePopoverRoot :open="true" :auto-focus="false" :restore-focus="false" placement="bottom-start" @update:open="open => { if (!open) emit('cancel'); }">
    <QuirePopoverAnchor><span class="qk-math-command-anchor" /></QuirePopoverAnchor>
    <QuirePopoverContent :portal-target="popupTarget()" class="qk-math-command" @pointerdown.stop @keydown="keydown">
      <div :ref="mounted" class="qk-math-command__body">
        <QuireInput v-model="query" :aria-label="text.messages.searchCommands" :placeholder="text.messages.searchCommandsPlaceholder" size="sm" width="100%" />
        <FormulaGrid :items="choices" :active="active" :label="text.messages.commands" @choose="emit('choose', $event)" />
      </div>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
<style>
.qk-math-command-anchor { display:block;width:1px;height:1px; }
.qk-math-command { width:min(360px,calc(100vw - 32px));display:flex;flex-direction:column;overflow:hidden;--qk-math-preview-size:18px; }
.qk-math-command__body { display:flex;flex-direction:column;min-height:0;gap:var(--qk-space-surface-compact); }
.qk-math-command__body > :first-child { flex:none; }
</style>
