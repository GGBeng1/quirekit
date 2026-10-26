<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import type { QuireKitChatQuestionAnswer, QuireKitChatQuestionItem, QuireKitChatQuestionOpenDetails, QuireKitChatQuestionOption, QuireKitChatQuestionProps, QuireKitChatQuestionSubmitDetails } from '../../../components/chat';
import QuireButton from '../../button/button.vue';
import QuireRadioGroup from '../../radio-group/radio-group.vue';
import QuireCheckboxGroup from '../../checkbox-group/checkbox-group.vue';
import QuireTextarea from '../../textarea/textarea.vue';
import { vChatFocusRecovery } from '../shared/focus-recovery';
import { useQuireKitMessages } from '../../locale-provider/context';

const props = defineProps<QuireKitChatQuestionProps>();
const emit = defineEmits<{
  /** Controlled answer draft update; the host can preserve it across remounts. */
  'update:draft': [answers: readonly QuireKitChatQuestionAnswer[]];
  /** Request a host-owned answer surface without moving or hiding the Composer. */
  open: [details: QuireKitChatQuestionOpenDetails];
  /** Submit intent; the host validates and sends the response. */
  submit: [details: QuireKitChatQuestionSubmitDetails];
}>();
const text = useQuireKitMessages('chat');
const labels = computed(() => text.value.question);
const localDraft = ref<readonly QuireKitChatQuestionAnswer[]>(props.defaultDraft ?? []);
const pendingDraft = ref<readonly QuireKitChatQuestionAnswer[] | undefined>();
const attempted = ref(false);
const summaryExpanded = ref(false);
const root = ref<HTMLElement | null>(null);
const draft = computed(() => props.draft ?? localDraft.value);
const currentAnswers = computed(() => props.state === 'answered' ? props.answers ?? draft.value : pendingDraft.value ?? draft.value);
const editable = computed(() => props.state === 'pending' || props.state === 'failed');
const prompt = computed(() => props.presentation === 'prompt');

watch(() => props.requestId, () => { localDraft.value = props.defaultDraft ?? []; pendingDraft.value = undefined; attempted.value = false; summaryExpanded.value = false; });
watch(() => props.draft, () => { pendingDraft.value = undefined; });
watch(() => props.state, (next, previous) => { if (next === 'answered' && previous !== 'answered') summaryExpanded.value = false; });

/** @param question - Visible question. @returns Its current draft or confirmed answer. */
function answerFor(question: QuireKitChatQuestionItem): QuireKitChatQuestionAnswer | undefined {
  return currentAnswers.value.find(answer => answer.questionId === question.id);
}

/** @param question - Selection question. @returns Predefined choices followed by its optional free-text choice. */
function optionsFor(question: QuireKitChatQuestionItem): readonly QuireKitChatQuestionOption[] {
  return question.customOption === undefined ? question.options ?? [] : [...(question.options ?? []), question.customOption];
}

/** @param question - Visible question. @returns Its current scalar or multiple value. */
function valueFor(question: QuireKitChatQuestionItem): string | readonly string[] {
  return answerFor(question)?.value ?? (question.kind === 'multiple' ? [] : '');
}

/** @param question - Visible question. @returns A scalar suitable for RadioGroup or Textarea. */
function scalarFor(question: QuireKitChatQuestionItem): string {
  const value = valueFor(question);
  return typeof value === 'string' ? value : '';
}

/** @param question - Visible question. @returns Ordered selected values. */
function multipleFor(question: QuireKitChatQuestionItem): readonly string[] {
  const value = valueFor(question);
  return Array.isArray(value) ? value : [];
}

/** @param question - Visible question. @returns The preserved free-text choice draft. */
function customFor(question: QuireKitChatQuestionItem): string {
  return answerFor(question)?.custom ?? '';
}

/** @param question - Selection question. @param value - Selected option values. @returns Whether the free-text choice is selected. */
function hasCustomChoice(question: QuireKitChatQuestionItem, value: string | readonly string[] = valueFor(question)): boolean {
  if (question.customOption === undefined || question.kind === 'text') return false;
  return typeof value === 'string' ? value === question.customOption.value : value.includes(question.customOption.value);
}

/** @param question - Visible question. @returns Whether a selected free-text choice still lacks text. */
function customMissing(question: QuireKitChatQuestionItem): boolean {
  return hasCustomChoice(question) && !customFor(question).trim();
}

/** @param question - Visible question. @returns Whether a required response is missing. */
function missing(question: QuireKitChatQuestionItem): boolean {
  if (customMissing(question)) return true;
  if (question.required === false) return false;
  const value = valueFor(question);
  return typeof value === 'string' ? !value.trim() : value.length === 0;
}

/** @param question - Answered prompt. @returns Human-readable option labels or free text for transcript history. */
function answerSummary(question: QuireKitChatQuestionItem): string {
  const answer = (props.answers ?? draft.value).find(item => item.questionId === question.id);
  const value = answer?.value;
  const values = value === undefined ? [] : typeof value === 'string' ? [value] : value;
  const visible = values.filter(item => item.trim()).map(item =>
    question.kind === 'text' ? item : item === question.customOption?.value
      ? answer?.custom?.trim() || labels.value.unanswered
      : question.options?.find(option => option.value === item)?.label ?? item);
  return visible.length > 0 ? visible.join(' · ') : labels.value.unanswered;
}

/** @param questionId - Stable question ID. @param patch - Updated selection or custom text. */
function update(questionId: string, patch: Partial<Pick<QuireKitChatQuestionAnswer, 'value' | 'custom'>>): void {
  if (!editable.value) return;
  const previous = (pendingDraft.value ?? draft.value).find(answer => answer.questionId === questionId);
  const custom = patch.custom ?? previous?.custom;
  const answer: QuireKitChatQuestionAnswer = {
    questionId, value: patch.value ?? previous?.value ?? '', ...(custom === undefined ? {} : { custom })
  };
  const next = [...(pendingDraft.value ?? draft.value).filter(item => item.questionId !== questionId), answer];
  pendingDraft.value = next;
  if (props.draft === undefined) localDraft.value = next;
  emit('update:draft', next);
}

/** @param question - Selection question. @param value - Newly selected options. */
function updateChoice(question: QuireKitChatQuestionItem, value: string | readonly string[]): void {
  const selectingCustom = !hasCustomChoice(question) && hasCustomChoice(question, value);
  update(question.id, { value });
  if (!selectingCustom) return;
  void nextTick(() => {
    const item = [...(root.value?.querySelectorAll<HTMLElement>('[data-question-id]') ?? [])]
      .find(element => element.dataset.questionId === question.id);
    item?.querySelector<HTMLTextAreaElement>('.qk-chat-question__custom-field textarea')?.focus();
  });
}

/** Validate required answers before forwarding one host-owned submit intent. */
function submit(): void {
  if (!editable.value) return;
  attempted.value = true;
  if (props.questions.some(missing)) return;
  emit('submit', {
    requestId: props.requestId,
    answers: props.questions.map(question => ({
      questionId: question.id, value: valueFor(question),
      ...(hasCustomChoice(question) ? { custom: customFor(question).trim() } : {})
    }))
  });
}
</script>

<template>
  <section ref="root" v-chat-focus-recovery :class="['qk-chat-question', prompt ? 'qk-chat-question--prompt' : 'qk-chat-decision']" :data-state="state" :data-presentation="presentation ?? 'form'" :aria-label="title" tabindex="-1">
    <div class="qk-chat-decision__heading">
      <strong class="qk-chat-decision__title">{{ title }}</strong>
      <span v-if="state !== 'pending'" class="qk-chat-decision__state" :data-state="state" role="status">{{ state === 'failed' ? labels.failed : labels[state] }}</span>
    </div>
    <p v-if="description" class="qk-chat-decision__description">{{ description }}</p>
    <div v-if="prompt && editable" class="qk-chat-question__prompt-actions">
      <QuireButton size="sm" variant="outline" @click="emit('open', { requestId })">{{ labels.open }}</QuireButton>
    </div>
    <div v-else-if="prompt && state === 'answered'" class="qk-chat-question__prompt-actions">
      <QuireButton size="sm" variant="text" :aria-expanded="summaryExpanded" @click="summaryExpanded = !summaryExpanded">{{ summaryExpanded ? labels.hideAnswers : labels.showAnswers }}</QuireButton>
    </div>
    <dl v-if="state === 'answered' && (!prompt || summaryExpanded)" class="qk-chat-question__summary">
      <div v-for="question in questions" :key="question.id" class="qk-chat-question__answer">
        <dt class="qk-chat-question__answer-label">{{ question.title }}</dt>
        <dd class="qk-chat-question__answer-value">{{ answerSummary(question) }}</dd>
      </div>
    </dl>
    <div v-else-if="!prompt" class="qk-chat-question__items">
      <div v-for="(question, index) in questions" :key="question.id" class="qk-chat-question__item" :data-question-id="question.id">
        <p v-if="questions.length > 1" class="qk-chat-question__number">{{ labels.position(index + 1, questions.length) }}</p>
        <QuireRadioGroup v-if="question.kind === 'single'" :model-value="scalarFor(question)" :items="optionsFor(question)" :label="question.title" :read-only="!editable" :disabled="state === 'expired'" :invalid="attempted && missing(question)" @update:model-value="updateChoice(question, $event ?? '')" />
        <QuireCheckboxGroup v-else-if="question.kind === 'multiple'" :model-value="multipleFor(question)" :items="optionsFor(question)" :label="question.title" :read-only="!editable" :disabled="state === 'expired'" :invalid="attempted && missing(question)" @update:model-value="updateChoice(question, $event)" />
        <div v-else class="qk-chat-question__text-field">
          <label class="qk-chat-question__label" :for="`${requestId}-${question.id}`">{{ question.title }}</label>
          <QuireTextarea :id="`${requestId}-${question.id}`" :model-value="scalarFor(question)" v-bind="question.placeholder === undefined ? {} : { placeholder: question.placeholder }" :read-only="!editable" :disabled="state === 'expired'" :invalid="attempted && missing(question)" :rows="2" :auto-resize="true" width="100%" @update:model-value="update(question.id, { value: $event })" />
        </div>
        <div v-if="question.customOption && hasCustomChoice(question)" class="qk-chat-question__custom-field">
          <label class="sr-only" :for="`${requestId}-${question.id}-custom`">{{ question.customOption.label }}</label>
          <QuireTextarea :id="`${requestId}-${question.id}-custom`" :model-value="customFor(question)" :placeholder="question.customOption.placeholder ?? labels.customPlaceholder"
            :read-only="!editable" :disabled="state === 'expired'" :invalid="attempted && customMissing(question)" :rows="1" :max-rows="6" :auto-resize="true" width="100%" @update:model-value="update(question.id, { custom: $event })" />
        </div>
        <p v-if="question.description" class="qk-chat-question__description">{{ question.description }}</p>
        <p v-if="attempted && missing(question)" class="qk-chat-question__required" role="alert">{{ customMissing(question) ? labels.customRequired : labels.required }}</p>
      </div>
    </div>
    <p v-if="state === 'failed'" class="qk-chat-decision__error" role="alert">{{ error || labels.failed }}</p>
    <div v-if="!prompt && (editable || state === 'submitting')" class="qk-chat-decision__actions">
      <QuireButton size="sm" color="primary" variant="solid" :busy="state === 'submitting'" :disabled="!editable" @click="submit">{{ labels.submit }}</QuireButton>
    </div>
  </section>
</template>
