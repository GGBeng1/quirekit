<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { createMathEditor } from '@quirekit/math';
import MathEditorView from './editor.vue';
import { acquireFormulaRenderer } from './rendering/renderer';
import type { MathAuthoringPanelProps } from './types';

const props = defineProps<MathAuthoringPanelProps>();
const emit = defineEmits<{ /** Local draft cancelled. */ cancel: []; /** Host accepted the formula. */ committed: [] }>();
const lease = acquireFormulaRenderer(true);
const editor = createMathEditor({ latex: props.latex, renderer: lease.renderer, commit: document => props.commit(document) });
watch(() => props.latex, source => editor.syncHost(source));
// This convenience wrapper owns the lifetime; the underlying view only borrows the instance.
onBeforeUnmount(() => { editor.destroy(); lease.release(); });
</script>
<template>
  <MathEditorView :editor="editor" :autofocus="autofocus" :popup-target="popupTarget" :locale="locale" @cancel="emit('cancel')" @committed="emit('committed')" />
</template>
