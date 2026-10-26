<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { createMathMatrixTemplate } from '@quirekit/math';
import type { MathMatrixEnvironment, MathTemplate } from '@quirekit/math';
import { QuireButton, QuireSelect } from '@quirekit/ui/vue';
import type { MatrixPickerProps } from './types';
import { createFormulaTemplatePreview } from './preview';
import FormulaSvg from '../rendering/svg.vue';
import { useMathUiText } from '../locale';
const props = defineProps<MatrixPickerProps>();
const emit = defineEmits<{ /** Complete matrix setup inserted as one history step. */ insert: [template: MathTemplate]; /** Returns to matrix shape choices without changing the formula. */ back: [] }>();
const text = useMathUiText();
const rows = ref('2');
const columns = ref('2');
const environment = computed(() => props.value.slice(7) as MathMatrixEnvironment);
const dimensions = Array.from({ length: 8 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }));
watch(environment, () => { if (environment.value === 'cases') columns.value = '2'; });
const template = computed(() => createMathMatrixTemplate(environment.value, Number(rows.value), environment.value === 'cases' ? 2 : Number(columns.value))!);
const document = computed(() => createFormulaTemplatePreview(template.value));
</script>
<template>
  <div class="qk-math-matrix">
    <div class="qk-math-matrix__settings">
      <span>{{ text.name(template) }}</span>
      <label class="qk-math-matrix__dimension">{{ text.messages.rows }}<QuireSelect v-model="rows" :items="dimensions" :label="text.messages.rowCount" :portalled="false" width="64px" size="sm" /></label>
      <label class="qk-math-matrix__dimension">{{ text.messages.columns }}<QuireSelect v-model="columns" :items="dimensions" :label="text.messages.columnCount" :disabled="environment === 'cases'" :portalled="false" width="64px" size="sm" /></label>
    </div>
    <div class="qk-math-matrix__preview" :aria-label="text.messages.matrixPreview"><FormulaSvg :document="document" /></div>
    <div class="qk-math-matrix__actions">
      <QuireButton size="sm" variant="text" @click="emit('back')">{{ text.messages.matrixBack }}</QuireButton>
      <QuireButton size="sm" variant="solid" @click="emit('insert', template)">{{ text.messages.matrixInsert }}</QuireButton>
    </div>
  </div>
</template>
<style>
.qk-math-matrix { display:grid;gap:var(--qk-space-surface-compact); }
.qk-math-matrix__settings { display:flex;align-items:center;gap:var(--qk-space-inline);flex-wrap:wrap;font-size:var(--qk-type-helper-font-size); }
.qk-math-matrix__dimension { display:flex;align-items:center;gap:var(--qk-space-inline); }
.qk-math-matrix__preview { display:grid;place-items:center;min-height:88px;max-height:180px;overflow:auto;padding:var(--qk-space-surface-compact);font-size:22px; }
.qk-math-matrix__actions { display:flex;justify-content:space-between;align-items:center;gap:var(--qk-space-inline); }
</style>
