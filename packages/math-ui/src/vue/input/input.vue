<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { formatMathSlotLabel, mathSlotLabelsEn, mathSlotLabelsZh } from '@quirekit/math';
import { useMathUiText } from '../locale';
import MathCommandMenu from './menu.vue';
import FormulaOverlay from './overlay.vue';
import { useMathEditorSnapshot } from '../use-editor';
import { mathRectStyle, useMathBrowser } from './use-browser';
import { useMathFit } from './use-fit';
import type { MathVisualInputProps } from './types';

const props = defineProps<MathVisualInputProps>();
const surface = ref<HTMLElement>(); const capture = ref<HTMLElement>(); const graphic = ref<HTMLElement>();
const state = useMathEditorSnapshot(() => props.editor);
const text = useMathUiText();
const disabled = computed(() => !state.value.canEdit);
const browser = useMathBrowser(() => props.editor, surface, capture, graphic, () => props.showSelection === true, state);
const fitSize = useMathFit(surface, () => state.value.presentation.layout?.width);
const position = computed(() => mathRectStyle(browser.snapshot.value.inputAnchor));
const overlay = computed(() => browser.snapshot.value.overlay);
const selected = computed(() => overlay.value.selected.map(rect => mathRectStyle(rect)!));
const decorated = computed(() => (state.value.focused || state.value.commandOpen || props.showSelection) && !disabled.value);
const selectionVersion = computed(() => JSON.stringify(state.value.selection));
const activeLabel = computed(() => {
  const slot = state.value.slots.find(item => item.id === state.value.selection.focus.slot);
  return slot ? formatMathSlotLabel(slot, text.value.locale === 'en' ? mathSlotLabelsEn : mathSlotLabelsZh) : '';
});
/** Restores native focus without altering the retained core selection. */
function focus(): void { browser.focus(); }
/** Dismisses the consumer-owned menu while retaining the canonical structural caret. */
function closeMenu(): void { props.editor.setCommandOpen(false); void nextTick(focus); }
/**
 * Sends one discovery choice to the headless authority and restores native focus.
 * @param value - Admitted command identity.
 */
function choose(value: string): void { props.editor.chooseCommand(value); void nextTick(focus); }
defineExpose({ focus });
</script>
<template>
  <div ref="surface" class="qk-math-input" :class="{ 'is-focused': state.focused, 'is-disabled': disabled }" :data-ready="state.presentation.ready" :data-layouts="state.presentation.layouts" :data-measurements="browser.snapshot.value.measurements" :data-pointer-updates="browser.snapshot.value.pointerUpdates" :aria-busy="state.presentation.pending">
    <div ref="graphic" class="qk-math-input__math" :style="fitSize ? { fontSize: `${fitSize}px` } : undefined" v-html="state.presentation.layout?.svg ?? ''" />
    <FormulaOverlay :slot="state.selection.focus.slot" :active="decorated ? mathRectStyle(overlay.active) : undefined" :caret="state.focused && !disabled ? mathRectStyle(overlay.caret) : undefined" :selected="decorated ? selected : []" :version="selectionVersion" :preedit="state.preedit" :composing="state.composing" />
    <!-- The consumer owns the capture element; the public browser binding owns its native events. -->
    <div ref="capture" class="qk-math-input__capture" role="textbox" :aria-label="text.messages.input" aria-multiline="true" contenteditable="plaintext-only" autocapitalize="off" autocorrect="off" :spellcheck="false" />
    <div v-if="state.commandOpen && !disabled" class="qk-math-input__menu-anchor" :style="{ left: position?.left ?? '0px', top: `calc(${position?.top ?? '0px'} + 32px)` }"><MathCommandMenu @choose="choose" @cancel="closeMenu" /></div>
    <span class="qk-math-input__role" aria-live="polite">{{ state.presentation.error ? text.messages.unrenderableInput : activeLabel }}</span>
  </div>
</template>
<style>
.qk-math-input { position:relative;min-height:200px;display:grid;align-items:center;overflow:auto;font-size:var(--qk-math-editor-size,28px);border:1px solid var(--qk-color-border-subtle);border-radius:var(--qk-radius-group);padding:var(--qk-space-surface);cursor:text;user-select:none;touch-action:none; }
.qk-math-input__math { position:relative;z-index:1;display:flex;justify-content:center;width:max-content;min-width:100%; }
.qk-math-input__math > svg { display:block;flex:none; }
.qk-math-input__math [data-mml-node] { pointer-events:bounding-box; }
.qk-math-input.is-focused { border-color:var(--qk-color-action-primary);box-shadow:0 0 0 1px var(--qk-color-action-primary); }
.qk-math-input__menu-anchor { position:absolute; }
.qk-math-input__capture { position:absolute;width:2px;height:24px;padding:0;border:0;opacity:0;pointer-events:none;overflow:hidden;font-size:24px;white-space:pre;user-select:text;-webkit-user-select:text; }
.qk-math-input [data-math-placeholder] { color:var(--qk-color-text-secondary);background:var(--qk-color-surface-subtle);cursor:text; }
.qk-math-input__role { position:absolute;bottom:8px;left:12px;font-family:var(--qk-type-helper-font-family);font-size:var(--qk-type-helper-font-size);color:var(--qk-color-text-secondary); }
.qk-math-input.is-disabled { opacity:var(--qk-opacity-disabled);cursor:default; }
</style>
