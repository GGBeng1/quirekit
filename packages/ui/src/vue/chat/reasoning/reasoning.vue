<script setup lang="ts">
import { computed } from 'vue';
import type { QuireKitChatActionDetails, QuireKitChatReasoningProps, QuireKitChatReasoningPart } from '../../../components/chat';
import Disclosure from '../shared/disclosure.vue';
import QuireChatMessageActions from '../message-actions/message-actions.vue';
import { useQuireKitMessages } from '../../locale-provider/context';
import { localActions } from '../shared/part-actions';
const props = withDefaults(defineProps<QuireKitChatReasoningProps>(), { open: undefined });
const emit = defineEmits<{ /** Controlled disclosure request. */ 'update:open': [value: boolean]; /** Part-local command request. */ action: [details: QuireKitChatActionDetails] }>();
defineSlots<{ /** Replace reasoning text while preserving its disclosure. */ default?: (context: { part: QuireKitChatReasoningPart }) => unknown }>();
const text = useQuireKitMessages('chat');
const identity = computed(() => JSON.stringify([props.messageId, props.part.id]));
</script>

<template>
  <Disclosure :process-id="identity" :title="part.title ?? text.reasoning.title" :state="part.state ?? 'complete'"
    :state-label="text.status[part.state ?? 'complete']" :open="open" :default-open="defaultOpen ?? false"
    v-bind="{ ...(part.summary === undefined ? {} : { summary: part.summary }), ...(part.meta === undefined ? {} : { meta: part.meta }) }"
    @update:open="emit('update:open', $event)">
    <slot :part="part"><div class="qk-chat-part__text" dir="auto">{{ part.text }}</div></slot>
    <template v-if="part.actions?.length" #actions>
      <QuireChatMessageActions :key="identity" :actions="localActions(part.actions)" :state="part.state ?? 'complete'" :part-id="part.id" :message-id="messageId" @action="emit('action', $event)" />
    </template>
  </Disclosure>
</template>
