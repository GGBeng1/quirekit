<script setup lang="ts">
import { shallowRef } from 'vue';
import { quireKitEditorIconData } from '@quirekit/ui';
import { QuireIcon, QuireToolbar, QuireToolbarAction, QuireToolbarSeparator } from '@quirekit/ui/vue';
import type { MathTemplate } from '@quirekit/math';
import TemplatePalette from './templates.vue';
import { formulaGroups } from './catalog';
import { formulaCategoryIcons } from './icons';
import { useMathUiText } from '../locale';
import type { FormulaFamily, FormulaToolbarProps } from './types';

defineProps<FormulaToolbarProps>();
const emit = defineEmits<{
  /** Complete supported structure chosen inside a gallery. */
  insert: [template: MathTemplate];
  /** Literal admitted mathematical symbol. */
  symbol: [text: string];
  /** At least one category popup currently owns focus. */
  openChange: [open: boolean];
  /** Dismissal restores the retained formula caret. */
  cancel: [];
  /** Steps the draft history back. */
  undo: [];
  /** Steps the draft history forward. */
  redo: [];
}>();
const text = useMathUiText();
const opened = shallowRef<Partial<Record<FormulaFamily, boolean>>>({});
/**
 * Keeps the formula selection visible while category focus moves between popups.
 * @param family - Stable category identity.
 * @param open - Whether its chooser owns focus.
 */
function setOpen(family: FormulaFamily, open: boolean): void {
  opened.value = { ...opened.value, [family]: open };
  emit('openChange', Object.values(opened.value).some(Boolean));
}
</script>

<template>
  <QuireToolbar :label="text.messages.toolbar" variant="outlined" align="start" :preserve-focus="true">
    <QuireToolbarAction :label="text.messages.undo" :disabled="!canUndo" @activate="emit('undo')"><QuireIcon :data="quireKitEditorIconData.undo" /></QuireToolbarAction>
    <QuireToolbarAction :label="text.messages.redo" :disabled="!canRedo" @activate="emit('redo')"><QuireIcon :data="quireKitEditorIconData.redo" /></QuireToolbarAction>
    <QuireToolbarSeparator />
    <TemplatePalette v-for="category in formulaGroups" :key="category.value" :label="text.name(category)" :trigger="category.glyph" :indicator="category.value !== 'common'" :initial-group="category.value" :disabled="disabled"
      @insert="emit('insert', $event)" @symbol="emit('symbol', $event)" @open-change="setOpen(category.value, $event)" @cancel="emit('cancel')">
      <QuireIcon :data="formulaCategoryIcons[category.value]" />
    </TemplatePalette>
  </QuireToolbar>
</template>
