<script setup lang="ts">
import { computed, onBeforeUpdate, onUpdated, shallowRef } from 'vue';
import type { QuireKitChatMessageBranchProps, QuireKitChatBranchChangeDetails } from '../../../components/chat';
import QuireChatMessageAction from '../message-action/message-action.vue';
import { useQuireKitMessages } from '../../locale-provider/context';
const props = defineProps<QuireKitChatMessageBranchProps>();
const text = useQuireKitMessages('chat');
const labels = computed(() => text.value.message);
const emit = defineEmits<{
  /** Request a selected identity, never mutate it locally. */
  change: [details: QuireKitChatBranchChangeDetails];
}>();
const root = shallowRef<HTMLElement | null>(null);
const position = shallowRef<HTMLElement | null>(null);
const index = computed(() => props.branch.ids.indexOf(props.branch.selectedId));
const valid = computed(() => index.value >= 0 && new Set(props.branch.ids).size === props.branch.ids.length && props.branch.ids.every(id => id.length > 0));
let previousFocus: HTMLButtonElement | null = null;
// Capture before native disabled blurs the endpoint button, then recover after DOM patching.
onBeforeUpdate(() => {
  const active = root.value?.ownerDocument.activeElement;
  previousFocus = active instanceof HTMLButtonElement && root.value?.contains(active) ? active : null;
});
onUpdated(() => {
  const document = root.value?.ownerDocument;
  if (previousFocus?.disabled && document && (document.activeElement === document.body || document.activeElement === previousFocus)) {
    position.value?.focus({ preventScroll: true });
  }
  previousFocus = null;
});

/** Request one existing neighboring branch.
 * @param direction - Logical previous or next offset.
 */
function move(direction: -1 | 1): void {
  const id = props.branch.ids[index.value + direction];
  if (!props.disabled && valid.value && id !== undefined) emit('change', { branchId: id, ...(props.messageId === undefined ? {} : { messageId: props.messageId }) });
}
</script>

<template>
  <div v-if="branch.ids.length > 1" ref="root" class="qk-chat-branch">
    <QuireChatMessageAction :action="{ id: 'previous', label: labels.previousBranch, icon: 'chevronLeft', disabled: disabled || !valid || index === 0 }" :tooltip="false" @action="move(-1)" />
    <span ref="position" class="qk-chat-branch__position" tabindex="-1" aria-live="polite" :dir="valid ? 'ltr' : undefined">{{ valid ? labels.branchPosition(index + 1, branch.ids.length) : labels.branchUnavailable }}</span>
    <QuireChatMessageAction :action="{ id: 'next', label: labels.nextBranch, icon: 'chevronRight', disabled: disabled || !valid || index === branch.ids.length - 1 }" :tooltip="false" @action="move(1)" />
  </div>
</template>
