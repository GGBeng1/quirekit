<script setup lang="ts">
import type { QuireKitChatProcessProps } from '../../../components/chat';
import Disclosure from '../shared/disclosure.vue';
const props = withDefaults(defineProps<QuireKitChatProcessProps>(), { open: undefined, defaultOpen: false, state: 'complete' });
defineEmits<{ /** Requests controlled expansion without mutating process data. */ 'update:open': [value: boolean] }>();
defineSlots<{ /** Stable ordered process children, supplied by the consumer. */ default?: () => unknown; /** Necessary recovery or confirmation actions, always outside the fold. */ actions?: () => unknown }>();
</script>

<template>
  <Disclosure content-layout="steps" :process-id="processId" :title="title" :state="state" :open="open" :default-open="defaultOpen"
    v-bind="{ ...(props.icon === undefined ? {} : { icon: props.icon }), ...(props.summary === undefined ? {} : { summary: props.summary }), ...(props.meta === undefined ? {} : { meta: props.meta }), ...(props.stateLabel === undefined ? {} : { stateLabel: props.stateLabel }) }"
    @update:open="$emit('update:open', $event)">
    <slot />
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
  </Disclosure>
</template>
