<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import type { QuireKitTerminalOutputProps } from '../../components/terminal-output';
import QuireButton from '../button/button.vue';
import QuireClipboard from '../clipboard/clipboard.vue';
import QuireCodeBlock from '../code-block/code-block.vue';
import { parseTerminalOutput } from './parse';
import { useQuireKitMessages } from '../locale-provider/context';

const props = withDefaults(defineProps<QuireKitTerminalOutputProps>(), {
  state: 'running', maxHeight: 360, maxVisibleCharacters: 80_000
});
const viewport = ref<HTMLElement | null>(null);
const following = ref(true);
const sourceView = ref(false);
const raw = computed(() => props.chunks.map(chunk => chunk.text).join(''));
const projection = computed(() => parseTerminalOutput(props.chunks, props.maxVisibleCharacters));
const sourceText = computed(() => raw.value.replaceAll('\u001b', '\\x1b').replaceAll('\u0007', '\\x07'));
const safeHeight = computed(() => `${Number.isFinite(props.maxHeight) ? Math.max(80, props.maxHeight) : 360}px`);
const text = useQuireKitMessages('terminalOutput');
const label = computed(() => props.label ?? text.value.label);
const stateText = computed(() => text.value[props.state]);

/** Keep following only while the reader is at the tail. */
function observeScroll(): void {
  const element = viewport.value;
  if (!element) return;
  following.value = element.scrollHeight - element.scrollTop - element.clientHeight <= 32;
}

/** Return to the live tail without changing the output or process state. */
function scrollToLatest(): void {
  const element = viewport.value;
  if (!element) return;
  element.scrollTop = element.scrollHeight;
  following.value = true;
}

watch(projection, async () => {
  if (!following.value || sourceView.value) return;
  await nextTick();
  scrollToLatest();
}, { flush: 'post' });
watch(sourceView, async value => {
  if (value || !following.value) return;
  await nextTick();
  scrollToLatest();
});
onMounted(scrollToLatest);
defineExpose({ scrollToLatest });
</script>

<template>
  <section class="qk-terminal-output" data-qk-not-prose :aria-label="label" :data-state="state">
    <div class="qk-terminal-output__toolbar">
      <span class="qk-terminal-output__status" :data-state="state" aria-live="polite">{{ stateText }}<template v-if="exitCode !== undefined"> · {{ text.exitCode(exitCode) }}</template></span>
      <span class="qk-terminal-output__tools">
        <QuireButton size="xs" variant="ghost" @click="sourceView = !sourceView">{{ sourceView ? text.rendered : text.source }}</QuireButton>
        <QuireClipboard v-if="!truncated && raw" :value="raw" :target="text.copyTarget" mode="icon" size="xs" variant="text" />
      </span>
    </div>
    <div v-if="!sourceView" ref="viewport" class="qk-terminal-output__viewport" :style="{ maxHeight: safeHeight }" tabindex="0" :aria-label="text.content(label)" @scroll.passive="observeScroll">
      <pre class="qk-terminal-output__content" dir="ltr"><span v-if="projection.clipped" class="qk-terminal-output__clipped">… {{ text.clipped }}
</span><span v-for="(span, index) in projection.spans" :key="index" :data-stream="span.stream" :data-color="span.color" :data-bold="span.bold || undefined" :data-dim="span.dim || undefined" :data-underline="span.underline || undefined">{{ span.text }}</span><span v-if="!projection.spans.length" class="qk-terminal-output__empty">{{ text.empty }}</span></pre>
    </div>
    <QuireCodeBlock v-else :code="sourceText" language="text" :header="false" :copy="false" variant="plain" density="compact" :max-height="maxHeight" :aria-label="text.sourceContent(label)" />
    <div v-if="truncated || (!following && !sourceView)" class="qk-terminal-output__foot">
      <span v-if="truncated" class="qk-terminal-output__truncated">{{ truncated }}</span>
      <QuireButton v-if="!following && !sourceView" size="xs" variant="ghost" class="qk-terminal-output__follow" @click="scrollToLatest">{{ text.follow }}</QuireButton>
    </div>
  </section>
</template>
