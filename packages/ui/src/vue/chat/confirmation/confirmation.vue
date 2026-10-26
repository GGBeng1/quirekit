<script setup lang="ts">
import { computed } from 'vue';
import type { QuireKitChatConfirmationDecision, QuireKitChatConfirmationProps, QuireKitChatConfirmationSlots } from '../../../components/chat';
import QuireButton from '../../button/button.vue';
import { vChatFocusRecovery } from '../shared/focus-recovery';
import { useQuireKitMessages } from '../../locale-provider/context';

const props = defineProps<QuireKitChatConfirmationProps>();
defineSlots<QuireKitChatConfirmationSlots>();
const emit = defineEmits<{ /** Request a decision; the host owns authorization and state changes. */ decide: [details: QuireKitChatConfirmationDecision] }>();
const text = useQuireKitMessages('chat');
const labels = computed(() => text.value.confirmation[props.intent ?? 'permission']);
const actionable = computed(() => props.state === 'pending' || props.state === 'failed');

/** @param decision - Explicit user choice, never a completed authorization. */
function decide(decision: QuireKitChatConfirmationDecision['decision']): void {
  if (!actionable.value) return;
  emit('decide', { requestId: props.requestId, decision });
}
</script>

<template>
  <section v-chat-focus-recovery class="qk-chat-decision qk-chat-confirmation" :data-state="state" :aria-label="title" tabindex="-1">
    <div class="qk-chat-decision__heading">
      <strong class="qk-chat-decision__title">{{ title }}</strong>
      <span class="qk-chat-decision__state" :data-state="state" role="status">{{ labels[state] }}</span>
    </div>
    <p v-if="description" class="qk-chat-decision__description">{{ description }}</p>
    <slot />
    <p v-if="state === 'failed'" class="qk-chat-decision__error" role="alert">{{ error || labels.failed }}</p>
    <div v-if="actionable || state === 'submitting'" class="qk-chat-decision__actions">
      <QuireButton size="sm" color="primary" variant="solid" :busy="state === 'submitting'" :disabled="!actionable" @click="decide('approve')">{{ labels.approve }}</QuireButton>
      <QuireButton size="sm" variant="ghost" :disabled="!actionable" @click="decide('reject')">{{ labels.reject }}</QuireButton>
    </div>
  </section>
</template>
