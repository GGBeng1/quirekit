<script setup lang="ts">
import { Popover } from '@ark-ui/vue/popover';
import { useId } from 'vue';
import { QuireButton } from '../button';
import { QuirePopoverContent, QuirePopoverDescription, QuirePopoverTitle, QuirePopoverTrigger } from '../popover';
import { usePopoverRuntime } from '../popover/use-runtime';
import { usePopconfirm } from './use-popconfirm';
import type { QuireKitPopconfirmProps } from './types';
import { useQuireKitMessages } from '../locale-provider/context';

defineOptions({ name: 'QuirePopconfirm', inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitPopconfirmProps>(), {
  open: undefined, defaultOpen: false, disabled: false, danger: false, placement: 'bottom-start', showArrow: true
});
const text = useQuireKitMessages('popconfirm');
const emit = defineEmits<{
  /** 请求更新打开状态。 */
  'update:open': [open: boolean];
  /** 确认操作成功。 */
  confirm: [];
  /** 用户取消。 */
  cancel: [];
  /** 确认失败，面板保留以便重试。 */
  confirmError: [error: unknown];
}>();
const id = `qk-popconfirm-${useId()}`;
const { open, failed, submitting, interact, confirm } = usePopconfirm(props, {
  updateOpen: value => emit('update:open', value), cancel: () => emit('cancel'),
  confirm: () => emit('confirm'), confirmError: error => emit('confirmError', error)
}, id);
/** @returns The safe initial action within the confirmation surface. */
function initialFocusEl(): HTMLElement | null { return document.getElementById(`${id}-cancel`); }
const { api } = usePopoverRuntime({
  get open() { return open.value; },
  get placement() { return props.placement; },
  get closeOnEscape() { return !submitting.value; },
  get closeOnInteractOutside() { return !submitting.value; },
  get finalFocusEl() { return props.finalFocusEl; },
  initialFocusEl
}, { updateOpen: interact, openChange: () => {}, escapeKeyDown: () => {}, interactOutside: () => {} }, {
  id, ids: { trigger: `${id}-trigger`, content: `${id}-content` }
});
</script>

<template>
  <Popover.RootProvider :value="api">
    <QuirePopoverTrigger as-child :disabled="disabled" :aria-disabled="disabled || undefined"><slot /></QuirePopoverTrigger>
    <QuirePopoverContent v-bind="$attrs" class="qk-popconfirm" border="subtle" :show-arrow="showArrow" :aria-busy="submitting || undefined">
      <QuirePopoverTitle>{{ title }}</QuirePopoverTitle>
      <QuirePopoverDescription v-if="description || $slots.description"><slot name="description">{{ description }}</slot></QuirePopoverDescription>
      <p v-if="failed" class="qk-popconfirm__error" role="alert">{{ errorText ?? text.error }}</p>
      <div class="qk-popconfirm__actions">
        <QuireButton :id="`${id}-cancel`" variant="text" :disabled="submitting" @click="interact(false)">{{ text.cancel }}</QuireButton>
        <QuireButton variant="solid" :color="danger ? 'danger' : 'primary'" :busy="submitting" @click="confirm">{{ confirmLabel ?? text.confirm }}</QuireButton>
      </div>
    </QuirePopoverContent>
  </Popover.RootProvider>
</template>
