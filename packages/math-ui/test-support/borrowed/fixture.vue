<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { createMathEditor } from '@quirekit/math';
import { createMathJaxRenderer } from '@quirekit/math-mathjax';
import { createTheme, quireIconRegistry } from '@quirekit/ui';
import { QuireButton, QuireIconProvider, QuireThemeProvider } from '@quirekit/ui/vue';
import { MathEditorView } from '../../src/index';

const saving = ref(false); const completed = ref(0);
let resolveCommit: ((accepted: boolean) => void) | undefined;
/**
 * Keeps the first host transaction pending while the consumer changes its borrowed view.
 * @returns Explicitly completed host acknowledgement.
 */
function save(): Promise<boolean> { saving.value = true; return new Promise(resolve => { resolveCommit = resolve; }); }
/** Completes the original host transaction independently of the currently mounted view. */
function finishSave(): void { resolveCommit?.(true); resolveCommit = undefined; saving.value = false; }
const first = createMathEditor({ latex: 'x', renderer: createMathJaxRenderer(), disposeRenderer: true, commit: save });
const second = createMathEditor({ latex: 'z', renderer: createMathJaxRenderer(), disposeRenderer: true, commit: async () => true });
const current = shallowRef(first); const mounted = ref(true);
const firstSource = ref(first.getSnapshot().draft); const secondSource = ref(second.getSnapshot().draft);
const firstDirty = ref(first.getSnapshot().dirty);
const stopFirst = first.subscribe(state => { firstSource.value = state.draft; firstDirty.value = state.dirty; });
const stopSecond = second.subscribe(state => { secondSource.value = state.draft; });
const theme = createTheme({ scheme: 'light' });
onBeforeUnmount(() => { stopFirst(); stopSecond(); first.destroy(); second.destroy(); });
</script>
<template>
  <QuireThemeProvider :theme="theme"><QuireIconProvider :registry="quireIconRegistry">
    <main style="max-width:760px;margin:24px auto">
      <QuireButton @click="mounted = !mounted">切换界面</QuireButton>
      <QuireButton @click="current = current === first ? second : first">切换实例</QuireButton>
      <QuireButton @click="first.insertText('y')">外部编辑</QuireButton>
      <QuireButton :disabled="!saving" @click="finishSave">完成保存</QuireButton>
      <MathEditorView v-if="mounted" :editor="current" @committed="completed++" />
      <output aria-label="第一个核心" :data-dirty="firstDirty">{{ firstSource }}</output>
      <output aria-label="第二个核心">{{ secondSource }}</output>
      <output aria-label="界面完成事件">{{ completed }}</output>
    </main>
  </QuireIconProvider></QuireThemeProvider>
</template>
