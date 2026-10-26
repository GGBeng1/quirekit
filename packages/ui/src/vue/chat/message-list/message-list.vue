<script setup lang="ts">
import { computed, ref, type ComponentPublicInstance } from 'vue';
import QuireScrollArea from '../../scroll-area/scroll-area.vue';
import QuireButton from '../../button/button.vue';
import QuireEmptyState from '../../empty-state/empty-state.vue';
import QuireChatMessage from '../message/message.vue';
import { useMessageListScroll } from './use-scroll';
import { useQuireKitMessages } from '../../locale-provider/context';
import type { QuireKitChatMessageListProps, QuireKitChatMessageListSlots, QuireKitChatMessageListHandle } from '../../../components/chat';
import type { QuireKitChatActionDetails, QuireKitChatAttachmentActionDetails, QuireKitChatBranchChangeDetails, QuireKitChatConfirmationDecisionDetails, QuireKitChatMessageListCopyDetails, QuireKitChatMessageListCopyErrorDetails, QuireKitChatQuestionDraftDetails, QuireKitChatQuestionOpenPartDetails, QuireKitChatQuestionSubmitPartDetails, QuireKitChatSourceNavigateDetails } from '../../../components/chat';

const props = withDefaults(defineProps<QuireKitChatMessageListProps>(), {
  conversationId: 'default', height: '24rem', hasOlder: false, loadingOlder: false, actionsVisibility: 'auto'
});
const emit = defineEmits<{
  /** 显式请求更早消息；分页与失败恢复由宿主处理。 */
  loadOlder: [];
  /** 跟随最新或阅读历史的策略变化。 */
  followingChange: [following: boolean];
  /** 默认 Message 或 Part 的业务操作意图，包含 messageId。 */
  action: [details: QuireKitChatActionDetails];
  /** 附件意图携带消息、Part 和附件三层身份。 */
  attachmentAction: [details: QuireKitChatAttachmentActionDetails];
  /** Navigation request with message, part and source identities. */
  sourceNavigate: [details: QuireKitChatSourceNavigateDetails];
  /** Approval intent scoped to the default message renderer. */
  confirmationDecision: [details: QuireKitChatConfirmationDecisionDetails];
  /** Question draft update scoped to the default message renderer. */
  questionDraftChange: [details: QuireKitChatQuestionDraftDetails];
  /** Answer-surface open intent scoped to the default message renderer. */
  questionOpen: [details: QuireKitChatQuestionOpenPartDetails];
  /** Question submit intent scoped to the default message renderer. */
  questionSubmit: [details: QuireKitChatQuestionSubmitPartDetails];
  /** 默认 Message 的受控分支切换意图。 */
  branchChange: [details: QuireKitChatBranchChangeDetails];
  /** 默认 Message 已完成公共 Clipboard 写入。 */
  copy: [details: QuireKitChatMessageListCopyDetails];
  /** 默认 Message 的 Clipboard 写入失败。 */
  copyError: [details: QuireKitChatMessageListCopyErrorDetails];
}>();
defineSlots<QuireKitChatMessageListSlots>();
const text = useQuireKitMessages('chat');
const area = ref<InstanceType<typeof QuireScrollArea>>();
const content = ref<HTMLElement>();
const keys = computed(() => props.messages.map(message => message.messageId));
const { following, nodes, onScroll, scrollToLatest, scrollToMessage } = useMessageListScroll({
  viewport: () => area.value?.getViewportElement() ?? null, content,
  keys: () => keys.value, session: () => props.conversationId,
  onFollowingChange: value => emit('followingChange', value)
});

/** Register real wrappers without inspecting private ScrollArea selectors.
 * @param key - Host identity.
 * @param element - Vue template-ref value.
 */
function track(key: string, element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLElement) nodes.set(key, element);
  else nodes.delete(key);
}

/** Keep keyboard focus in the conversation after its jump button disappears. */
function jumpToLatest(): void {
  scrollToLatest(); area.value?.getViewportElement()?.focus({ preventScroll: true });
}

/** Emit at most one request while the host marks the history action pending. */
function loadOlder(): void {
  if (props.hasOlder && !props.loadingOlder) emit('loadOlder');
}

defineExpose<QuireKitChatMessageListHandle>({ scrollToLatest, scrollToMessage });
</script>

<template>
  <div class="qk-chat-message-list" :style="{ height }" :data-following="following">
    <QuireScrollArea ref="area" class="qk-chat-message-list__area" :label="label ?? text.list.label"
      viewport-class="qk-chat-message-list__viewport" @scroll="onScroll">
      <div ref="content" class="qk-chat-message-list__content">
        <div v-if="hasOlder" class="qk-chat-message-list__history">
          <QuireButton :busy="loadingOlder" @click="loadOlder">{{ text.list.loadOlder }}</QuireButton>
        </div>
        <div v-if="messages.length" :key="conversationId" class="qk-chat-message-list__list" role="list">
          <div v-for="(message, index) in messages" :key="message.messageId" :ref="element => track(message.messageId, element)"
            class="qk-chat-message-list__item" role="listitem" :data-message-key="message.messageId">
            <slot name="message" :message="message" :index="index" :latest="message.latest ?? index === messages.length - 1"
              :actions-visibility="message.actionsVisibility ?? actionsVisibility">
              <QuireChatMessage v-bind="message" :latest="message.latest ?? index === messages.length - 1"
                :actions-visibility="message.actionsVisibility ?? actionsVisibility"
                @action="emit('action', { ...$event, messageId: message.messageId })"
                @attachment-action="emit('attachmentAction', { ...$event, messageId: message.messageId })"
                @source-navigate="emit('sourceNavigate', { ...$event, messageId: message.messageId })"
                @confirmation-decision="emit('confirmationDecision', { ...$event, messageId: message.messageId })"
                @question-draft-change="emit('questionDraftChange', { ...$event, messageId: message.messageId })"
                @question-open="emit('questionOpen', { ...$event, messageId: message.messageId })"
                @question-submit="emit('questionSubmit', { ...$event, messageId: message.messageId })"
                @branch-change="emit('branchChange', { ...$event, messageId: message.messageId })"
                @copy="emit('copy', { messageId: message.messageId })"
                @copy-error="emit('copyError', { ...$event, messageId: message.messageId })">
                <template v-if="$slots.text" #text="context"><slot name="text" v-bind="context" /></template>
                <template v-if="$slots.reasoning" #reasoning="context"><slot name="reasoning" v-bind="context" /></template>
                <template v-if="$slots['tool-input']" #tool-input="context"><slot name="tool-input" v-bind="context" /></template>
                <template v-if="$slots['tool-output']" #tool-output="context"><slot name="tool-output" v-bind="context" /></template>
                <template v-if="$slots.custom" #custom="context"><slot name="custom" v-bind="context" /></template>
              </QuireChatMessage>
            </slot>
          </div>
        </div>
        <div v-else class="qk-chat-message-list__empty">
          <slot name="empty"><QuireEmptyState :description="text.list.empty" /></slot>
        </div>
      </div>
    </QuireScrollArea>
    <div v-if="!following" class="qk-chat-message-list__latest">
      <QuireButton variant="soft" @click="jumpToLatest">{{ text.list.latest }}</QuireButton>
    </div>
  </div>
</template>
