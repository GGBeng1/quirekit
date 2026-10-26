<script setup lang="ts">
import type { FormulaOverlayProps } from './overlay-types';
defineProps<FormulaOverlayProps>();
</script>
<template>
  <div class="qk-math-overlay" aria-hidden="true">
    <span v-if="active" class="qk-math-overlay__slot" :style="active" :data-math-active-slot="slot" />
    <span v-for="(box, index) in selected" :key="index" class="qk-math-overlay__selection" :style="box" data-math-selected="true" />
    <span v-if="caret && !selected.length" :key="version" class="qk-math-input__caret" :class="{ 'is-composing': composing }" :style="caret" />
    <span v-if="preedit && caret" class="qk-math-input__preedit" :style="caret">{{ preedit }}</span>
  </div>
</template>
<style>
.qk-math-overlay { position:absolute;inset:0;pointer-events:none; }
.qk-math-overlay__slot { position:absolute;z-index:2;outline:1px dashed var(--qk-color-action-primary);outline-offset:3px; }
.qk-math-overlay__selection { position:absolute;z-index:0;background:var(--qk-color-surface-selected); }
.qk-math-input__caret { position:absolute;z-index:2;width:1px;background:var(--qk-color-action-primary);animation:qk-math-caret-blink 1s step-end infinite; }
.qk-math-input__caret.is-composing { animation:none; }
.qk-math-input__preedit { position:absolute;z-index:3;width:max-content;border-bottom:1px dashed currentColor;background:var(--qk-color-surface-default); }
@keyframes qk-math-caret-blink { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
@media (prefers-reduced-motion:reduce) { .qk-math-input__caret { animation:none; } }
</style>
