<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { QuireButton } from "../button";
import { QuireCodeBlock } from "../code-block";
import { QuireProsePreview } from "../prose/preview";
import { useQuireKitMessages } from "../locale-provider/context";
import { useHtmlSandboxRuntime } from "./use-runtime";
import type { HtmlSandboxDiagnostic, HtmlSandboxState } from "@quirekit/html-sandbox";
import type { QuireKitHtmlSandboxProps, QuireKitHtmlSandboxExpose } from "./types";

const props = withDefaults(defineProps<QuireKitHtmlSandboxProps>(), { complete: true, interactionGated: false });
defineOptions({ inheritAttrs: false });
const emit = defineEmits<{
  /** Current execution phase and dirty state. */ "state-change": [state: HtmlSandboxState];
  /** Bounded text-only report. */ diagnostic: [diagnostic: HtmlSandboxDiagnostic];
  /** Applied viewport height in CSS pixels. */ resize: [height: number];
}>();
const text = useQuireKitMessages("htmlSandbox");
const outer = ref<HTMLElement>();
const entered = ref(false);
const expanded = ref(false);
const mount = shallowRef<HTMLElement>();
const { state, logs, pending, height, run, stop } = useHtmlSandboxRuntime(props, {
  state: value => emit("state-change", value), diagnostic: value => emit("diagnostic", value), resize: value => emit("resize", value),
  exit: leave,
}, mount);
const active = computed(() => state.value.phase === "starting" || state.value.phase === "running");
const name = computed(() => props.title ?? text.value.title);
const status = computed(() => !props.complete ? text.value.incomplete : props.config?.execution === "disabled" ? text.value.disabled : state.value.dirty ? text.value.dirty : text.value[state.value.phase]);
watch(() => [props.identity, state.value.runId, active.value], () => { entered.value = false; });
/** Restore focus to a trusted control; guest Escape is only a convenience. */
function leave(): void {
  entered.value = false;
  outer.value?.querySelector<HTMLButtonElement>("button")?.focus();
}
/** Enter an embedded page explicitly while the editor owns block selection. */
function enter(): void { entered.value = true; mount.value?.querySelector("iframe")?.focus(); }
/** @returns Whether the current complete source was admitted. */
async function execute(): Promise<boolean> { return run(); }
defineExpose<QuireKitHtmlSandboxExpose>({ run: execute, stop });
</script>
<template>
  <section ref="outer" v-bind="$attrs" class="qk-html-sandbox" :aria-label="name" data-qk-not-prose data-qk-not-typography :data-phase="state.phase">
    <div class="qk-html-sandbox__toolbar">
      <span class="qk-html-sandbox__title">{{ name }}</span>
      <span class="qk-html-sandbox__status" role="status">{{ status }}</span>
      <QuireButton variant="soft" :disabled="!complete || config?.execution === 'disabled' || pending" @click="execute">{{ active ? text.rerun : text.run }}</QuireButton>
      <QuireButton :disabled="!active && !pending" @click="stop">{{ text.stop }}</QuireButton>
      <QuireButton v-if="interactionGated && entered" @click="leave">{{ text.leave }}</QuireButton>
    </div>
    <QuireProsePreview :label="name">
      <div class="qk-html-sandbox__viewport" :style="{ height: `${height}px` }">
        <div ref="mount" class="qk-html-sandbox__mount" :inert="interactionGated && !entered" />
        <div v-if="!active" class="qk-html-sandbox__placeholder"><span>{{ status }}</span></div>
        <div v-else-if="interactionGated && !entered" class="qk-html-sandbox__gate">
          <QuireButton variant="solid" @click.stop="enter">{{ text.enter }}</QuireButton>
        </div>
      </div>
      <template #source><QuireCodeBlock :code="html" language="html" variant="plain" :max-height="height" /></template>
    </QuireProsePreview>
    <div v-if="logs.length" class="qk-html-sandbox__diagnostics">
      <QuireButton :aria-expanded="expanded" @click="expanded = !expanded">{{ text.logs }} · {{ logs.length }}</QuireButton>
      <ol v-if="expanded" class="qk-html-sandbox__logs" :aria-label="text.logs">
        <li v-for="(entry, index) in logs" :key="index"><span>{{ entry.level }} · {{ entry.code }}</span><pre>{{ entry.message }}</pre></li>
      </ol>
    </div>
  </section>
</template>
