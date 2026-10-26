<script setup lang="ts">
import { computed } from 'vue';
import QuireButton from '../../button/button.vue';
import QuireIconButton from '../../button/icon-button.vue';
import QuireIcon from '../../icon/icon.vue';
import type { QuireKitChatComposerSubmitProps } from '../../../components/chat';
import { useQuireKitMessages } from '../../locale-provider/context';

const props = withDefaults(defineProps<QuireKitChatComposerSubmitProps>(), {
  canSubmit: false, busy: false, disabled: false, appearance: 'icon', color: 'primary', size: 'md'
});
const emit = defineEmits<{
  /** 请求发送；不持有任何业务状态。 */
  submit: [];
  /** 请求停止；实际取消由宿主执行。 */
  stop: [];
}>();
const unavailable = computed(() => props.disabled || (!props.busy && !props.canSubmit));
const text = useQuireKitMessages('chat');
const label = computed(() => props.busy ? text.value.composer.stop : text.value.composer.submit);

/** Keep the same button mounted while its available intent changes. */
function activate(): void {
  if (!unavailable.value) props.busy ? emit('stop') : emit('submit');
}
</script>

<template>
  <QuireIconButton v-if="appearance === 'icon'" :label="label" :title="label" shape="circle" variant="solid"
    :color="color" :size="size" :disabled="unavailable" :data-mode="busy ? 'stop' : 'submit'" @click="activate">
    <QuireIcon :name="busy ? 'square' : 'arrowUp'" :size="16" />
  </QuireIconButton>
  <QuireButton v-else variant="solid" :color="color" :size="size" :disabled="unavailable"
    :data-mode="busy ? 'stop' : 'submit'" @click="activate">{{ label }}</QuireButton>
</template>
