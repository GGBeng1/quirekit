<script setup lang="ts">
import { computed, ref } from 'vue';
import { createTheme, quireIconRegistry } from '@quirekit/ui';
import { QuireButton, QuireIconProvider, QuireThemeProvider } from '@quirekit/ui/vue';
import { MathAuthoringPanel } from '../src/index';
import type { MathDocument } from '@quirekit/math';

const parameters = new URLSearchParams(location.search);
const testing = parameters.has('test');
// `?latex=` supplies the host formula, including unsupported source.
const source = ref(parameters.get('latex') ?? (testing ? 'x' : ''));
const saved = ref('');
const reject = ref(testing);
const cancelled = ref(0);
const dark = ref(false);
const mounted = ref(true);
const theme = computed(() => createTheme({ scheme: dark.value ? 'dark' : 'light' }));
const requestedSize = Number(parameters.get('size'));
const formulaSize = requestedSize >= 16 && requestedSize <= 128 ? `${requestedSize}px` : undefined;
/**
 * Models a host command outcome for the shared panel acceptance fixture.
 * @param document - Prepared supported formula.
 * @returns Whether the host accepted its transaction.
 */
function commit(document: MathDocument): boolean {
  if (reject.value) return false;
  source.value = document.latex; saved.value = document.latex; return true;
}
</script>
<template>
  <QuireThemeProvider :theme="theme">
    <QuireIconProvider :registry="quireIconRegistry">
      <main class="math-demo" :style="{ '--qk-math-editor-size': formulaSize }">
        <header class="math-demo__header">
          <div><span class="math-demo__brand">QuireKit</span><h1>公式编辑</h1><p>选择模板，点击公式中的空槽直接输入，无需掌握 LaTeX。</p></div>
          <QuireButton variant="outline" size="sm" @click="dark = !dark">切换主题</QuireButton>
        </header>
        <div class="math-demo__surface">
          <MathAuthoringPanel v-if="mounted" :latex="source" :commit="commit" @cancel="cancelled++" />
        </div>
        <p class="math-demo__status" role="status">{{ saved ? '公式已保存' : '编辑完成后点击确定保存公式' }}</p>
        <template v-if="testing">
          <MathAuthoringPanel latex="z" :commit="() => false" />
          <div class="math-demo__testing">
            <QuireButton variant="outline" @click="reject = false">允许宿主保存</QuireButton>
            <QuireButton variant="outline" @click="source = 'a'">外部修改公式</QuireButton>
            <QuireButton variant="outline" @click="mounted = !mounted">切换公式面板</QuireButton>
            <output aria-label="已保存公式">{{ saved }}</output>
            <output aria-label="取消次数">{{ cancelled }}</output>
          </div>
        </template>
      </main>
    </QuireIconProvider>
  </QuireThemeProvider>
</template>
<style>
body { margin:0; }
.math-demo { box-sizing:border-box;min-height:100vh;padding:40px 24px;background:var(--qk-color-surface-page);color:var(--qk-color-text-primary);font-family:system-ui,sans-serif; }
.math-demo__header { max-width:760px;margin:0 auto 24px;display:flex;align-items:center;justify-content:space-between;gap:16px; }
.math-demo__brand { font-size:12px;font-weight:600;color:var(--qk-color-text-secondary); }
.math-demo h1 { margin:8px 0;font-size:24px; }
.math-demo p { font-size:14px;color:var(--qk-color-text-secondary); }
.math-demo__surface { max-width:760px;margin:auto;border:1px solid var(--qk-color-border-subtle);border-radius:12px;overflow:hidden; }
.math-demo__status { max-width:760px;margin:16px auto; }
.math-demo__testing { display:flex;gap:12px;flex-wrap:wrap;margin-top:24px; }
@media(max-width:480px) { .math-demo { padding:20px 12px; } .math-demo__header { align-items:flex-start; } }
</style>
