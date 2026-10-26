<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, useId } from 'vue';
import type { MathTemplate } from '@quirekit/math';
import { QuireButton, QuireCollapsible, QuireTextarea } from '@quirekit/ui/vue';
import type { MathEditorViewProps } from './types';
import { mathPopupTargetKey } from './popup';
import { provideMathUiText } from './locale';
import { useMathEditorSnapshot } from './use-editor';
import FormulaToolbar from './palette/toolbar.vue';
import MathVisualInput from './input/input.vue';
import type { MathVisualInputHandle } from './input/types';

const props = defineProps<MathEditorViewProps>();
const emit = defineEmits<{ /** Local draft cancelled; host restores focus. */ cancel: []; /** Matching host transaction succeeded. */ committed: [] }>();
const id = useId(); const visual = ref<MathVisualInputHandle>(); const chooserOpen = ref(false);
const state = useMathEditorSnapshot(() => props.editor);
const historyReady = computed(() => !(state.value.busy || state.value.conflict || state.value.disabled || state.value.disposed || state.value.composing));
const text = provideMathUiText(() => props.locale);
const status = computed(() => {
  const messages = text.value.messages, current = state.value;
  if (current.conflict) return messages.conflict;
  if (current.diagnostic) return messages.diagnosticAt(messages.diagnostics?.[current.diagnostic.code] ?? current.diagnostic.message, current.diagnostic.offset);
  return current.feedback ? messages.feedback[current.feedback] : '';
});
let alive = true; onBeforeUnmount(() => { alive = false; });
onMounted(() => { if (props.autofocus) visual.value?.focus(); });
provide(mathPopupTargetKey, () => props.popupTarget);
/**
 * Sends a toolbar structure to the headless editor, then restores native input focus.
 * @param template - Admitted structure.
 */
function insert(template: MathTemplate): void { props.editor.insertTemplate(template); visual.value?.focus(); }
/**
 * Sends a literal symbol to the headless editor without a second source authority.
 * @param text - Admitted math characters.
 */
function insertText(text: string): void { props.editor.insertText(text); visual.value?.focus(); }
/**
 * Reflects only the core's matching host acknowledgement in UI events.
 * @returns Resolves after the externally owned commit settles.
 */
async function submit(): Promise<void> {
  const submittedEditor = props.editor;
  const result = await submittedEditor.commit();
  // A borrowed instance may change while its original host transaction is still running.
  if (result.status === 'committed' && alive && props.editor === submittedEditor) emit('committed');
}
/**
 * Steps the draft history, then restores native input focus.
 * @param direction - History direction.
 */
function history(direction: 'undo' | 'redo'): void { props.editor[direction](); visual.value?.focus(); }
/** Discards local draft through the core; the host still owns document mutation. */
function cancel(): void { props.editor.cancel(); emit('cancel'); }
</script>
<template>
  <section class="qk-math-panel" :aria-label="text.messages.panel" :aria-busy="state.busy">
    <FormulaToolbar :disabled="!state.canEdit || state.composing" :can-undo="historyReady && state.canUndo" :can-redo="historyReady && state.canRedo"
      @insert="insert" @symbol="insertText" @open-change="chooserOpen = $event" @cancel="visual?.focus()" @undo="history('undo')" @redo="history('redo')" />
    <MathVisualInput ref="visual" :editor="editor" :show-selection="chooserOpen" />
    <span class="qk-math-panel__hint">{{ text.messages.hint }}</span>
    <!-- Unsupported host source can only be repaired in source form, so start with it visible. -->
    <QuireCollapsible :title="text.messages.sourceOptional" variant="plain" size="sm" :default-open="!!state.diagnostic">
      <label :for="id">{{ text.messages.source }}</label>
      <QuireTextarea :id="id" :model-value="state.draft" :placeholder="text.messages.source" :disabled="state.busy || state.conflict || state.disabled || state.disposed || state.composing" :invalid="!!state.diagnostic" :maxlength="16384" :rows="3" width="100%" :aria-describedby="id + '-feedback'" @update:model-value="editor.setLatex($event)" />
    </QuireCollapsible>
    <p :id="id + '-feedback'" role="status">{{ status }}</p>
    <div class="qk-math-panel__actions">
      <QuireButton v-if="state.conflict" size="sm" variant="outline" :disabled="state.busy" @click="editor.reload()">{{ text.messages.reload }}</QuireButton>
      <QuireButton size="sm" variant="text" :disabled="state.busy || state.disposed" @click="cancel">{{ text.messages.cancel }}</QuireButton>
      <QuireButton size="sm" variant="solid" color="primary" :busy="state.busy" :disabled="!state.canCommit" @click="submit">{{ text.messages.confirm }}</QuireButton>
    </div>
  </section>
</template>
<style>
.qk-math-panel { display:grid;gap:var(--qk-space-surface-compact);min-width:0;padding:var(--qk-space-surface);color:var(--qk-color-text-primary);background:var(--qk-color-surface-raised); }
.qk-math-panel__actions { display:flex;align-items:center;justify-content:flex-end;gap:var(--qk-space-inline);flex-wrap:wrap; }
.qk-math-panel__hint { font-size:var(--qk-type-helper-font-size);color:var(--qk-color-text-secondary);line-height:var(--qk-type-helper-line-height); }
.qk-math-panel p { margin:0;font-size:var(--qk-type-helper-font-size);color:var(--qk-color-text-secondary);overflow-wrap:anywhere; }
/* The status line takes no space, and adds no grid gap, until it has a message. */
.qk-math-panel p:empty { display:none; }

</style>
