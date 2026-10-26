<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import type { QuireKitChatActionDetails, QuireKitChatAttachmentActionDetails, QuireKitChatBranchChangeDetails, QuireKitChatConfirmationDecisionDetails, QuireKitChatMessageProps, QuireKitChatMessageSlots, QuireKitChatQuestionDraftDetails, QuireKitChatQuestionOpenPartDetails, QuireKitChatQuestionSubmitPartDetails, QuireKitChatSourceNavigateDetails } from '../../../components/chat';
import type { QuireKitClipboardErrorDetails } from '../../../components/clipboard';
import QuireChatMessagePart from '../message-part/message-part.vue';
import ChatActions from '../message-actions/message-actions.vue';
import ChatBranch from '../message-branch/message-branch.vue';
import LocaleScope from '../shared/locale-scope.vue';
import QuireIcon from '../../icon/icon.vue';
import QuireShimmer from '../../shimmer/shimmer.vue';
import { stateIcon } from '../shared/state-icon';
import { useQuireKitMessages } from '../../locale-provider/context';
import { vChatFocusRecovery } from '../shared/focus-recovery';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitChatMessageProps>(), { align: 'start', variant: 'plain', showHeader: false, state: 'complete', actionsVisibility: 'auto', latest: true });
const slots = defineSlots<QuireKitChatMessageSlots>();
const emit = defineEmits<{
  /** Business action request; no business execution is performed. */
  action: [details: QuireKitChatActionDetails];
  /** Attachment business intent with message, part and resource identities. */
  attachmentAction: [details: QuireKitChatAttachmentActionDetails];
  /** Navigation request from a source part. */
  sourceNavigate: [details: QuireKitChatSourceNavigateDetails];
  /** Approval intent with stable Part ownership. */
  confirmationDecision: [details: QuireKitChatConfirmationDecisionDetails];
  /** Question draft update with stable Part ownership. */
  questionDraftChange: [details: QuireKitChatQuestionDraftDetails];
  /** Answer-surface open intent with stable Part ownership. */
  questionOpen: [details: QuireKitChatQuestionOpenPartDetails];
  /** Question submit intent with stable Part ownership. */
  questionSubmit: [details: QuireKitChatQuestionSubmitPartDetails];
  /** Requests a controlled branch change. */
  branchChange: [details: QuireKitChatBranchChangeDetails];
  /** Clipboard write completed. */
  copy: [];
  /** Clipboard write failed. */
  copyError: [details: QuireKitClipboardErrorDetails];
}>();
const root = shallowRef<HTMLElement | null>(null);
const text = useQuireKitMessages('chat');
const identity = computed(() => JSON.stringify([props.messageId, props.branch?.selectedId]));
const status = computed(() => props.statusText ?? (props.state === 'complete' ? '' : text.value.status[props.state]));
const active = computed(() => props.state === 'pending' || props.state === 'streaming');
const hasActions = computed(() => !!slots.actions || (!active.value && props.copyText !== undefined) || props.actions?.some(action => action.when === 'always' || (action.when === 'active' ? active.value : !active.value)));
const hasFooter = computed(() => hasActions.value || props.meta || (props.branch?.ids.length ?? 0) > 1);
/** Reveal the whole footer together, preserving emergency actions and its layout slot.
 * @returns Whether this message footer waits for pointer or keyboard focus.
 */
const footerReveal = computed(() => props.state !== 'error' && !props.actions?.some(action =>
  action.when === 'always' || (action.when === 'active' && active.value)) &&
  (props.actionsVisibility === 'hover' || (props.actionsVisibility === 'auto' && !props.latest)));
const announcement = ref('');
// Historical initial content is not announced. Only an existing message's state transitions are.
watch(() => [props.state, props.statusText], () => { announcement.value = status.value; });
watch(identity, () => { announcement.value = ''; });

</script>

<template>
  <LocaleScope v-slot="{ dir }">
  <article ref="root" v-chat-focus-recovery v-bind="$attrs" class="qk-chat-message" :dir="dir" :data-align="align" :data-variant="variant" :data-state="state"
    :data-message-id="messageId" :data-actions-visibility="actionsVisibility" :aria-label="author" tabindex="-1">
    <div class="qk-chat-message__body">
      <div v-if="showHeader" class="qk-chat-message__header">
        <span v-if="$slots.avatar" class="qk-chat-message__avatar"><slot name="avatar" /></span>
        <slot name="header"><span>{{ author }}</span></slot>
      </div>
      <div v-if="$slots.default || parts?.length" :key="identity" class="qk-chat-message__content" :data-mode="$slots.default ? 'slot' : 'parts'">
        <slot>
          <QuireChatMessagePart v-for="part in parts" :key="part.id" :part="part" :message-id="messageId" @action="emit('action', $event)" @attachment-action="emit('attachmentAction', $event)" @source-navigate="emit('sourceNavigate', $event)" @confirmation-decision="emit('confirmationDecision', $event)" @question-draft-change="emit('questionDraftChange', $event)" @question-open="emit('questionOpen', $event)" @question-submit="emit('questionSubmit', $event)">
            <template v-if="$slots.text" #text="context"><slot name="text" v-bind="context" /></template>
            <template v-if="$slots.reasoning" #reasoning="context"><slot name="reasoning" v-bind="context" /></template>
            <template v-if="$slots['tool-input']" #tool-input="context"><slot name="tool-input" v-bind="context" /></template>
            <template v-if="$slots['tool-output']" #tool-output="context"><slot name="tool-output" v-bind="context" /></template>
            <template v-if="$slots.custom" #custom="context"><slot name="custom" v-bind="context" /></template>
          </QuireChatMessagePart>
        </slot>
      </div>
      <div v-if="$slots.status || status" class="qk-chat-message__status" :data-state="state">
        <slot name="status">
          <QuireShimmer v-if="active" :text="status" />
          <template v-else><QuireIcon :name="stateIcon(state)" :size="16" /><span>{{ status }}</span></template>
        </slot>
      </div>
      <div v-if="hasFooter" class="qk-chat-message__footer" :data-reveal="footerReveal || undefined">
        <ChatBranch v-if="branch && branch.ids.length > 1" :branch="branch" :message-id="messageId" :disabled="active" @change="emit('branchChange', $event)" />
        <div v-if="hasActions" class="qk-chat-message__actions">
          <slot name="actions" :latest="latest" :visibility="actionsVisibility"><ChatActions :key="identity" :message-id="messageId" :actions="actions" :copy-text="copyText" :state="state" :latest="latest" :visibility="actionsVisibility"
            @action="emit('action', $event)" @copy="emit('copy')" @copy-error="emit('copyError', $event)" /></slot>
        </div>
        <span v-if="meta" class="qk-chat-message__meta" dir="auto">{{ meta }}</span>
      </div>
    </div>
    <span class="sr-only" role="status" aria-live="polite">{{ announcement }}</span>
  </article>
  </LocaleScope>
</template>
