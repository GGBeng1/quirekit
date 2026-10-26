<script setup lang="ts">
import { computed } from 'vue';
import type { QuireKitChatActionDetails, QuireKitChatToolProps, QuireKitChatToolPart } from '../../../components/chat';
import Disclosure from '../shared/disclosure.vue';
import QuireCodeBlock from '../../code-block/code-block.vue';
import QuireIcon from '../../icon/icon.vue';
import QuireChatMessageActions from '../message-actions/message-actions.vue';
import { useQuireKitMessages } from '../../locale-provider/context';
import { actionState, localActions } from '../shared/part-actions';
const props = withDefaults(defineProps<QuireKitChatToolProps>(), { open: undefined });
const emit = defineEmits<{ /** Controlled disclosure request. */ 'update:open': [value: boolean]; /** Part-local command request. */ action: [details: QuireKitChatActionDetails] }>();
const slots = defineSlots<{ /** Parameter renderer. */ input?: (context: { part: QuireKitChatToolPart }) => unknown; /** Result renderer. */ output?: (context: { part: QuireKitChatToolPart }) => unknown }>();
const text = useQuireKitMessages('chat');
const identity = computed(() => JSON.stringify([props.messageId, props.part.id]));
</script>

<template>
  <Disclosure :process-id="identity" :title="part.title" :state="part.state" :icon="part.icon ?? 'terminal'"
    :state-label="part.stateLabel ?? text.status[part.state]" :open="open" :default-open="defaultOpen ?? false"
    v-bind="{ ...(part.summary === undefined ? {} : { summary: part.summary }), ...(part.meta === undefined ? {} : { meta: part.meta }) }"
    @update:open="emit('update:open', $event)">
    <slot v-if="part.input !== undefined || slots.input" name="input" :part="part">
      <QuireCodeBlock :code="part.input ?? ''" :header="false" :aria-label="text.tool.input" :language="part.inputLanguage ?? 'text'" density="compact" dir="ltr" />
    </slot>
    <slot v-if="part.output !== undefined || slots.output" name="output" :part="part">
      <QuireCodeBlock :code="part.output ?? ''" :header="false" :aria-label="text.tool.output" :language="part.outputLanguage ?? 'text'" :copy="!part.outputTruncated" density="compact" dir="ltr" />
    </slot>
    <p v-if="part.outputTruncated" class="qk-chat-part__hint">{{ part.outputTruncated }}</p>
    <p v-if="part.input === undefined && part.output === undefined && !part.error && !slots.input && !slots.output" class="qk-chat-part__hint">{{ text.tool.empty }}</p>
    <template v-if="part.error || part.actions?.length" #actions>
      <div v-if="part.error" class="qk-chat-part__error"><QuireIcon name="circleX" :size="16" /><span dir="auto">{{ part.error }}</span></div>
      <QuireChatMessageActions v-if="part.actions?.length" :key="identity" :actions="localActions(part.actions)" :state="actionState(part.state)" :part-id="part.id" :message-id="messageId" @action="emit('action', $event)" />
    </template>
  </Disclosure>
</template>
