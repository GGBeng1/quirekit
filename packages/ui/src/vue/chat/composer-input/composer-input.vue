<script setup lang="ts">
import { ref } from 'vue';
import { useQuireKitMessages } from '../../locale-provider/context';
import QuireTextarea from '../../textarea/textarea.vue';
import type { QuireKitTextareaInstance } from '../../../components/textarea';
import type { QuireKitChatComposerInputProps, QuireKitChatSubmitDetails } from '../../../components/chat';

const props = withDefaults(defineProps<QuireKitChatComposerInputProps>(), {
  size: 'md', variant: 'outline', submitMode: 'enter', rows: 1, maxRows: 8
});
const emit = defineEmits<{
  /** 通知受控草稿 owner。 */
  'update:modelValue': [value: string];
  /** 未经业务门禁的提交手势；父组件决定是否允许发送。 */
  submit: [details: QuireKitChatSubmitDetails];
}>();
const input = ref<QuireKitTextareaInstance>();
const text = useQuireKitMessages('chat');

/** Keep disabled / readonly inputs controlled even for synthetic input events.
 * @param value - Literal draft from Textarea.
 */
function updateValue(value: string): void {
  if (!props.disabled && !props.readOnly) emit('update:modelValue', value);
}

/** Preserve IME confirmation and modified Enter; only an unmodified gesture requests submission.
 * @param event - Native field keyboard event.
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.key !== 'Enter' || props.submitMode !== 'enter'
    || event.isComposing || event.keyCode === 229 || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  if (!event.repeat && !props.disabled && !props.readOnly) emit('submit', { text: props.modelValue });
}

/** Forward focus through the public Textarea contract.
 * @param options - Native focus scrolling options.
 */
function focus(options?: FocusOptions): void { input.value?.focus(options); }
defineExpose({ focus });
</script>

<template>
  <QuireTextarea ref="input" :model-value="modelValue" :aria-label="label ?? text.composer.label" :placeholder="placeholder ?? text.composer.placeholder" :size="size" :variant="variant"
    :disabled="disabled" :read-only="readOnly" :rows="rows" :max-rows="maxRows" auto-resize width="100%"
    @update:model-value="updateValue" @keydown="onKeydown" />
</template>
