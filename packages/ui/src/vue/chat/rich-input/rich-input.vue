<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useId, watch } from 'vue';
import QuireTextarea from '../../textarea/textarea.vue';
import CandidateList from '../../candidate-list/candidate-list.vue';
import type { QuireKitTextareaInstance } from '../../../components/textarea';
import type { QuireKitChatInputSelection, QuireKitChatInputSnapshot, QuireKitChatInputToken, QuireKitChatRichInputProps } from '../../../components/chat/rich-input/types';
import { equalChatInputTokens, insertChatInputToken, rebaseChatInputTokens } from './model';
import { useChatInputCandidates } from './use-candidates';
import { createChatInputHistory } from './history';
import { useChatCandidatePosition } from './use-candidate-position';
import { useQuireKitMessages } from '../../locale-provider/context';

const props = withDefaults(defineProps<QuireKitChatRichInputProps>(), {
  submitMode: 'enter', rows: 2, maxRows: 8, disabled: false, readOnly: false
});
const emit = defineEmits<{
  /** Literal controlled draft update. */
  'update:modelValue': [value: string];
  /** Structured token update in the same edit as the literal draft. */
  'update:tokens': [tokens: readonly QuireKitChatInputToken[]];
  /** Atomic edit payload for hosts that keep text and tokens in one state object. */
  change: [snapshot: QuireKitChatInputSnapshot];
  /** Current selection after pointer, keyboard or edit movement. */
  selectionChange: [selection: QuireKitChatInputSelection];
  /** Unmodified Enter outside an open candidate list. */
  submit: [snapshot: QuireKitChatInputSnapshot];
  /** Candidate resolver failed for the current query; the host owns feedback. */
  candidateError: [error: unknown];
}>();
const text = useQuireKitMessages('chat');
const textarea = ref<QuireKitTextareaInstance>();
const field = shallowRef<HTMLTextAreaElement | null>(null);
const popup = shallowRef<HTMLElement | null>(null);
const draft = ref(props.modelValue);
const tokens = ref<readonly QuireKitChatInputToken[]>([...props.tokens]);
const selection = ref<QuireKitChatInputSelection>({ from: 0, to: 0 });
const focused = ref(false);
const composing = ref(false);
const candidates = useChatInputCandidates((query, signal) => props.resolveCandidates(query, signal), error => emit('candidateError', error));
const history = createChatInputHistory();
const listId = `qk-chat-candidates-${useId()}`;
const open = computed(() => focused.value && !props.disabled && !props.readOnly && !!candidates.query.value && candidates.items.value.length > 0);
const activeId = computed(() => open.value && candidates.activeIndex.value >= 0 ? `${listId}-item-${candidates.activeIndex.value}` : undefined);
useChatCandidatePosition(field, popup, open);
let pendingBefore: QuireKitChatInputSnapshot | null = null;
let compositionBefore: QuireKitChatInputSnapshot | null = null;
let occurrence = 0;
let disposed = false;
onBeforeUnmount(() => { disposed = true; });

/** Return a defensive atomic snapshot of text, references and selection.
 * @returns Current draft state.
 */
function getSnapshot(): QuireKitChatInputSnapshot {
  return { text: draft.value, tokens: [...tokens.value], selection: { ...selection.value } };
}

/** Notify all controlled channels after one edit.
 * @param text - Next literal draft.
 * @param nextTokens - Next semantic references.
 */
function commit(text: string, nextTokens: readonly QuireKitChatInputToken[]): void {
  draft.value = text; tokens.value = nextTokens;
  emit('update:modelValue', text);
  emit('update:tokens', nextTokens);
  emit('change', getSnapshot());
}

/** Read the native selection and refresh the candidate query. */
function readSelection(): void {
  const input = field.value;
  if (!input) return;
  const next = { from: input.selectionStart, to: input.selectionEnd };
  if (selection.value.from !== next.from || selection.value.to !== next.to) {
    selection.value = next;
    emit('selectionChange', next);
  }
  if (!composing.value && focused.value && !props.disabled && !props.readOnly) {
    candidates.refresh(draft.value, next.from === next.to ? next.to : null, tokens.value);
  }
}

/** Restore a UTF-16 selection without remounting the native field.
 * @param next - Selection range to restore.
 */
function setSelection(next: QuireKitChatInputSelection): void {
  selection.value = next;
  field.value?.setSelectionRange(next.from, next.to);
  emit('selectionChange', next);
  readSelection();
}

/** Focus through the Textarea public API.
 * @param options - Native focus options.
 */
function focus(options?: FocusOptions): void { textarea.value?.focus(options); }
defineExpose({ focus, getSnapshot, setSelection });

/** Capture the native field without querying another component's DOM.
 * @param event - Forwarded native focus event.
 */
function onFocus(event: FocusEvent): void {
  field.value = event.target as HTMLTextAreaElement;
  focused.value = true;
  readSelection();
}

/** Close candidate UI when the editor loses focus. */
function onBlur(): void { focused.value = false; candidates.clear(); }

/** Preserve the pre-edit state and own browser undo for semantic tokens.
 * @param event - Native beforeinput event.
 */
function onBeforeInput(event: InputEvent): void {
  if (props.disabled || props.readOnly) return;
  if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
    event.preventDefault(); restore(event.inputType === 'historyUndo' ? 'undo' : 'redo'); return;
  }
  readSelection();
  pendingBefore = getSnapshot();
  if (event.inputType === 'deleteContentBackward' || event.inputType === 'deleteContentForward') {
    if (removeToken(event.inputType === 'deleteContentBackward' ? 'backward' : 'forward')) event.preventDefault();
  }
}

/** Keep token ranges in sync with native typing, paste and input methods.
 * @param event - Native input event forwarded by Textarea.
 */
function onInput(event: Event): void {
  const input = event.target as HTMLTextAreaElement;
  field.value = input;
  const next = input.value;
  if (next === draft.value) { pendingBefore = null; readSelection(); return; }
  const previous = pendingBefore ?? getSnapshot();
  pendingBefore = null;
  const rebased = rebaseChatInputTokens(draft.value, next, tokens.value, previous.selection);
  if (!composing.value && !compositionBefore) history.push(previous);
  selection.value = { from: input.selectionStart, to: input.selectionEnd };
  commit(next, rebased);
  if (!composing.value && !compositionBefore && focused.value) candidates.refresh(next, selection.value.from === selection.value.to ? selection.value.to : null, rebased);
  emit('selectionChange', selection.value);
}

/** Treat an entire IME composition as one undoable transaction. */
function onCompositionStart(): void { compositionBefore = getSnapshot(); pendingBefore = null; composing.value = true; candidates.clear(); }

/** Resume lookup only after the input method has committed its final text. */
function onCompositionEnd(): void {
  composing.value = false;
  queueMicrotask(() => {
    if (disposed) return;
    if (compositionBefore && (compositionBefore.text !== draft.value || !equalChatInputTokens(compositionBefore.tokens, tokens.value))) {
      history.push(compositionBefore);
    }
    compositionBefore = null;
    readSelection();
  });
}

/** Apply a programmatic edit and restore its caret after Vue patches the field.
 * @param text - Next literal draft.
 * @param nextTokens - Next token set.
 * @param caret - Next caret position.
 */
function replace(text: string, nextTokens: readonly QuireKitChatInputToken[], caret: number): void {
  history.push(getSnapshot());
  if (field.value) field.value.value = text;
  selection.value = { from: caret, to: caret };
  commit(text, nextTokens);
  candidates.clear();
  void nextTick(() => { focus(); setSelection({ from: caret, to: caret }); });
}

/** Remove a whole adjacent or intersecting token instead of leaving half a reference.
 * @param direction - Delete gesture direction.
 * @returns Whether a token was removed.
 */
function removeToken(direction: 'backward' | 'forward'): boolean {
  const { from, to } = selection.value;
  const touched = tokens.value.filter(token => from === to
    ? direction === 'backward' ? token.from < from && from <= token.to : token.from <= from && from < token.to
    : token.from < to && token.to > from);
  if (!touched.length) return false;
  const start = Math.min(from, ...touched.map(token => token.from));
  const end = Math.max(to, ...touched.map(token => token.to));
  const text = draft.value.slice(0, start) + draft.value.slice(end);
  replace(text, rebaseChatInputTokens(draft.value, text, tokens.value), start);
  pendingBefore = null;
  return true;
}

/** Replace the active query with a feature-owned candidate.
 * @param key - Selected candidate identity.
 */
function selectCandidate(key: string): void {
  const query = candidates.query.value;
  const candidate = candidates.items.value.find(item => item.key === key && !item.disabled);
  if (!query || !candidate || props.disabled || props.readOnly) return;
  const result = insertChatInputToken(draft.value, tokens.value, query, candidate.key,
    candidate.insertText ?? candidate.label, `${listId}-${++occurrence}`);
  replace(result.text, result.tokens, result.caret);
}

/** Keep navigation, submission and token deletion in the focused editor.
 * @param event - Native key event.
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || composing.value || props.disabled || props.readOnly) return;
  const shortcut = event.metaKey || event.ctrlKey;
  if (shortcut && !event.altKey && event.key.toLowerCase() === 'z') {
    event.preventDefault(); restore(event.shiftKey ? 'redo' : 'undo'); return;
  }
  if (shortcut && !event.altKey && event.key.toLowerCase() === 'y') {
    event.preventDefault(); restore('redo'); return;
  }
  if (open.value && !shortcut && !event.altKey && !event.shiftKey) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); candidates.move(event.key === 'ArrowDown' ? 1 : -1); return;
    }
    if (event.key === 'Escape') { event.preventDefault(); candidates.dismiss(); return; }
    if (event.key === 'Enter') {
      event.preventDefault(); if (!event.repeat) selectCandidate(candidates.active.value?.key ?? ''); return;
    }
  }
  if ((event.key === 'Backspace' || event.key === 'Delete') && !shortcut && !event.altKey) {
    readSelection();
    if (removeToken(event.key === 'Backspace' ? 'backward' : 'forward')) { event.preventDefault(); return; }
  }
  if (event.key === 'Enter' && props.submitMode === 'enter' && !event.shiftKey && !event.altKey && !shortcut) {
    event.preventDefault();
    if (!event.repeat && !candidates.loading.value) emit('submit', getSnapshot());
  }
}

/** Restore one atomic history state.
 * @param direction - Undo or redo.
 */
function restore(direction: 'undo' | 'redo'): void {
  const previous = history.step(direction, getSnapshot());
  if (!previous) return;
  if (field.value) field.value.value = previous.text;
  selection.value = previous.selection;
  commit(previous.text, previous.tokens);
  candidates.clear();
  void nextTick(() => setSelection(previous.selection));
}

watch([() => props.modelValue, () => props.tokens], ([text, externalTokens]) => {
  if (text === draft.value && equalChatInputTokens(externalTokens, tokens.value)) return;
  draft.value = text; tokens.value = [...externalTokens];
  selection.value = { from: Math.min(selection.value.from, text.length), to: Math.min(selection.value.to, text.length) };
  history.clear(); candidates.clear();
});
watch([() => props.disabled, () => props.readOnly], () => {
  if (props.disabled || props.readOnly) candidates.clear();
});
</script>

<template>
  <div class="qk-chat-rich-input" role="combobox" :aria-label="label" :aria-expanded="open"
    :aria-controls="open ? listId : undefined" :data-candidates-open="open || undefined">
    <QuireTextarea ref="textarea" :model-value="draft" :aria-label="label" :placeholder="placeholder ?? text.composer.placeholder" variant="embedded"
      size="md" width="100%" :rows="rows" :max-rows="maxRows" auto-resize :disabled="disabled" :read-only="readOnly"
      aria-autocomplete="list" :aria-controls="open ? listId : undefined" :aria-activedescendant="activeId"
      @focus="onFocus" @blur="onBlur" @beforeinput="onBeforeInput" @input="onInput" @keydown="onKeydown"
      @keyup="readSelection" @click="readSelection" @select="readSelection"
      @compositionstart="onCompositionStart" @compositionend="onCompositionEnd" />
    <div v-if="open" ref="popup" class="qk-chat-rich-input__candidates" style="visibility: hidden">
      <CandidateList :id="listId" :label="text.composer.candidates" :items="candidates.items.value"
        :active-key="candidates.active.value?.key" @select="selectCandidate" />
    </div>
  </div>
</template>
