<script setup lang="ts">
import { useMathPopupTarget } from '../popup';
import { computed, nextTick, ref, watch } from 'vue';
import { mathTemplates } from '@quirekit/math';
import type { MathTemplate } from '@quirekit/math';
import { QuireInput, QuirePopoverAnchor, QuirePopoverContent, QuirePopoverRoot, QuirePopoverTrigger, QuireSelect, QuireToolbarDisclosure } from '@quirekit/ui/vue';
import FormulaGrid from './grid.vue';
import MatrixPicker from './matrix.vue';
import { formulaChoices, formulaGroups, matchesFormula } from './catalog';
import type { TemplatePaletteProps } from './types';
import { moveFormulaChoice } from './navigation';
import { useMathUiText } from '../locale';
const props = defineProps<TemplatePaletteProps>();
defineSlots<{ /** Compact category artwork supplied by the shared toolbar. */ default?: () => unknown }>();
const emit = defineEmits<{ /** Complete admitted template. */ insert: [template: MathTemplate]; /** Literal admitted symbol. */ symbol: [text: string]; /** Owned chooser focus. */ openChange: [open: boolean]; /** Explicit dismissal restores the retained formula input. */ cancel: [] }>();
const text = useMathUiText();
const groups = computed(() => formulaGroups.map(item => ({ ...item, label: text.value.name(item) })));
const open = ref(false);
const query = ref('');
const group = ref<string>(props.initialGroup ?? 'basic');
const matrix = ref('');
const content = ref<HTMLElement>();
const active = ref(0);
const choices = computed(() => formulaChoices.filter(item => matchesFormula(item, query.value) && (query.value.trim() || item.group === group.value)));
watch(open, value => { emit('openChange', value); if (!value) { query.value = ''; matrix.value = ''; } });
watch(group, () => { matrix.value = ''; });
watch(choices, () => { active.value = 0; });
/**
 * Keeps matrix configuration local until one complete template is accepted.
 * @param value - Admitted command identity.
 */
function choose(value: string): void {
  if (value.startsWith('matrix-')) { matrix.value = value; query.value = ''; return; }
  open.value = false;
  if (value.startsWith('symbol:')) emit('symbol', value.slice(7));
  else { const template = mathTemplates.find(item => item.id === value); if (template) emit('insert', template); }
}
/**
 * Inserts the configured matrix as one draft history step.
 * @param template - Complete validated rectangular template.
 */
function insertMatrix(template: MathTemplate): void { open.value = false; emit('insert', template); }
/**
 * Returns to the retained formula caret after Escape or outside dismissal.
 * @param value - Public overlay's next open state.
 */
function dismissed(value: boolean): void { if (!value) emit('cancel'); }
/**
 * Navigates visual search results while leaving category/value controls to public UI.
 * @param event - Keyboard event from the search input.
 */
function keydown(event: KeyboardEvent): void {
  if (matrix.value || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey) return;
  if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    active.value = moveFormulaChoice(Array.from(content.value?.querySelectorAll('.qk-math-choice') ?? []), active.value, event.key);
    void nextTick(() => content.value?.querySelectorAll('.qk-math-choice')[active.value]?.scrollIntoView({ block: 'nearest' }));
  } else if (event.key === 'Enter') { event.preventDefault(); const item = choices.value[active.value]; if (item) choose(item.value); }
}
const popupTarget = useMathPopupTarget();
</script>
<template>
  <QuirePopoverRoot v-model:open="open" :restore-focus="false" placement="bottom-start" @update:open="dismissed">
    <QuirePopoverAnchor><span class="qk-math-gallery__anchor">
      <QuirePopoverTrigger as-child><QuireToolbarDisclosure v-model:expanded="open" :toggle-on-click="false" popup="dialog" :indicator="indicator !== false" :disabled="disabled" :label="label">
        <slot><span class="qk-math-gallery__glyph">{{ trigger }}</span></slot>
      </QuireToolbarDisclosure></QuirePopoverTrigger>
    </span></QuirePopoverAnchor>
    <QuirePopoverContent :portal-target="popupTarget()" width="min(480px, calc(100vw - 32px))" class="qk-math-gallery">
      <div ref="content" class="qk-math-gallery__body">
      <div class="qk-math-gallery__header">
        <QuireInput v-model="query" :aria-label="text.messages.searchTemplates" :placeholder="text.messages.searchTemplatesPlaceholder" size="sm" width="100%" @keydown="keydown" />
        <QuireSelect v-if="!query.trim()" v-model="group" :items="groups" :label="text.messages.category" :portalled="false" :layer-offset="1" size="sm" width="152px" content-width="min(240px, calc(100vw - 32px))" />
        <span v-else class="qk-math-gallery__caption">{{ text.messages.allCategories }}</span>
      </div>
      <MatrixPicker v-if="matrix && !query.trim()" :value="matrix" @insert="insertMatrix" @back="matrix = ''" />
      <FormulaGrid v-else :items="choices" :visible="open" :active="query.trim() ? active : -1" :disabled="disabled" :label="text.messages.gallery" @choose="choose" />
      </div>
    </QuirePopoverContent>
  </QuirePopoverRoot>
</template>
<style>
.qk-math-gallery__glyph { font-family:math;font-size:18px;line-height:1;white-space:nowrap; }
.qk-math-gallery__anchor { display:inline-flex; }
.qk-math-gallery { display:flex;flex-direction:column;overflow:hidden; }
.qk-math-gallery__body { display:flex;flex-direction:column;min-height:0; }
.qk-math-gallery__header { display:flex;flex:none;align-items:center;gap:var(--qk-space-inline);margin-bottom:var(--qk-space-surface-compact); }
.qk-math-gallery__caption { color:var(--qk-color-text-tertiary);font-size:var(--qk-type-helper-font-size);white-space:nowrap; }
@media (max-width:440px) { .qk-math-gallery__header { flex-wrap:wrap; } }
</style>
