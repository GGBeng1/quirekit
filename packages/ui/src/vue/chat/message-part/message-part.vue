<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import type { QuireKitChatActionDetails, QuireKitChatAttachmentActionDetails, QuireKitChatConfirmationDecisionDetails, QuireKitChatMessagePartProps, QuireKitChatPartSlots, QuireKitChatQuestionDraftDetails, QuireKitChatQuestionOpenPartDetails, QuireKitChatQuestionSubmitPartDetails, QuireKitChatSourceNavigateDetails } from '../../../components/chat';
import QuireAlert from '../../alert/alert.vue';
import QuireAttachments from '../../attachment/attachments.vue';
import QuireChatReasoning from '../reasoning/reasoning.vue';
import QuireChatTool from '../tool/tool.vue';
import QuireSources from '../../sources/sources.vue';
import QuireChatConfirmation from '../confirmation/confirmation.vue';
import QuireChatQuestion from '../question/question.vue';
import ChatActions from '../message-actions/message-actions.vue';
import LocaleScope from '../shared/locale-scope.vue';
import { useQuireKitMessages } from '../../locale-provider/context';
import { localActions, actionState } from '../shared/part-actions';
import { vChatFocusRecovery } from '../shared/focus-recovery';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitChatMessagePartProps>(), { defaultOpen: false, open: undefined });
defineSlots<QuireKitChatPartSlots>();
const emit = defineEmits<{
  /** Requests an optional controlled disclosure change. */
  'update:open': [value: boolean];
  /** Requests a part-local business command. */
  action: [details: QuireKitChatActionDetails];
  /** Requests an attachment intent with its stable message and part identity. */
  attachmentAction: [details: QuireKitChatAttachmentActionDetails];
  /** Requests host navigation to one source in this part. */
  sourceNavigate: [details: QuireKitChatSourceNavigateDetails];
  /** Host-owned approval request. */
  confirmationDecision: [details: QuireKitChatConfirmationDecisionDetails];
  /** Controlled question draft update. */
  questionDraftChange: [details: QuireKitChatQuestionDraftDetails];
  /** Open the host-owned answer surface. */
  questionOpen: [details: QuireKitChatQuestionOpenPartDetails];
  /** Host-owned question submit request. */
  questionSubmit: [details: QuireKitChatQuestionSubmitPartDetails];
}>();
const root = shallowRef<HTMLElement | null>(null);
const identity = computed(() => JSON.stringify([props.messageId, props.part.id, props.part.kind]));
const text = useQuireKitMessages('chat');
const state = computed(() => 'state' in props.part ? props.part.state ?? 'complete' : 'complete');
</script>

<template>
  <LocaleScope v-slot="{ dir }">
  <div ref="root" v-chat-focus-recovery v-bind="$attrs" class="qk-chat-part" :dir="dir" :data-part-id="part.id" :data-kind="part.kind" :data-state="state" tabindex="-1">
    <div :key="identity" class="qk-chat-part__content">
      <template v-if="part.kind === 'text'">
        <slot name="text" :part="part">
          <p v-if="part.format === 'markdown'" class="qk-chat-part__hint">{{ text.part.markdownFallback }}</p>
          <div class="qk-chat-part__text" dir="auto">{{ part.text }}</div>
        </slot>
        <div v-if="state === 'stopped' || state === 'error'" class="qk-chat-part__hint">{{ text.status[state] }}</div>
      </template>
      <QuireChatReasoning v-else-if="part.kind === 'reasoning'" :part="part" :message-id="messageId" :open="open" :default-open="defaultOpen"
        @update:open="emit('update:open', $event)" @action="emit('action', $event)">
        <template v-if="$slots.reasoning" #default="context"><slot name="reasoning" v-bind="context" /></template>
      </QuireChatReasoning>
      <QuireChatTool v-else-if="part.kind === 'tool'" :part="part" :message-id="messageId" :open="open" :default-open="defaultOpen"
        @update:open="emit('update:open', $event)" @action="emit('action', $event)">
        <template v-if="$slots['tool-input']" #input="context"><slot name="tool-input" v-bind="context" /></template>
        <template v-if="$slots['tool-output']" #output="context"><slot name="tool-output" v-bind="context" /></template>
      </QuireChatTool>
      <QuireAttachments v-else-if="part.kind === 'attachment'" :items="part.items" :layout="part.layout" :preview="part.preview" :label="part.label"
        @action="emit('attachmentAction', { ...$event, messageId, partId: part.id })" />
      <QuireSources v-else-if="part.kind === 'sources'" :sources="part.sources" v-bind="{ ...(part.title === undefined ? {} : { title: part.title }), ...(open === undefined ? {} : { open }) }" :default-open="defaultOpen"
        @update:open="emit('update:open', $event)" @navigate="emit('sourceNavigate', { ...$event, ...(messageId === undefined ? {} : { messageId }), partId: part.id })" />
      <QuireChatConfirmation v-else-if="part.kind === 'confirmation'" :request-id="part.requestId" :title="part.title" :state="part.state" v-bind="{ ...(part.description === undefined ? {} : { description: part.description }), ...(part.error === undefined ? {} : { error: part.error }), ...(part.intent === undefined ? {} : { intent: part.intent }) }"
        @decide="emit('confirmationDecision', { ...$event, ...(messageId === undefined ? {} : { messageId }), partId: part.id })" />
      <QuireChatQuestion v-else-if="part.kind === 'question'" :request-id="part.requestId" :title="part.title" :questions="part.questions" :state="part.state" v-bind="{ ...(part.presentation === undefined ? {} : { presentation: part.presentation }), ...(part.description === undefined ? {} : { description: part.description }), ...(part.error === undefined ? {} : { error: part.error }), ...(part.draft === undefined ? {} : { draft: part.draft }), ...(part.defaultDraft === undefined ? {} : { defaultDraft: part.defaultDraft }), ...(part.answers === undefined ? {} : { answers: part.answers }) }"
        @update:draft="emit('questionDraftChange', { answers: $event, ...(messageId === undefined ? {} : { messageId }), partId: part.id })"
        @open="emit('questionOpen', { ...$event, ...(messageId === undefined ? {} : { messageId }), partId: part.id })"
        @submit="emit('questionSubmit', { ...$event, ...(messageId === undefined ? {} : { messageId }), partId: part.id })" />
      <QuireAlert v-else-if="part.kind === 'notice'" :title="part.title" v-bind="part.description === undefined ? {} : { description: part.description }" :color="part.color ?? 'neutral'" variant="subtle" />
      <slot v-else-if="part.kind === 'custom'" name="custom" :part="part">
        <QuireAlert :title="part.name" :description="part.fallback" color="neutral" variant="subtle" />
      </slot>
      <QuireAlert v-else :title="text.part.unsupported" color="neutral" variant="subtle" />
      <ChatActions v-if="part.kind !== 'reasoning' && part.kind !== 'tool' && part.actions?.length" :actions="localActions(part.actions)" :state="actionState(state)" :part-id="part.id" :message-id="messageId" @action="emit('action', $event)" />
    </div>
  </div>
  </LocaleScope>
</template>
