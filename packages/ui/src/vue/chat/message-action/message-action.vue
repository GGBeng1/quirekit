<script setup lang="ts">
import { computed, mergeProps, useAttrs } from 'vue';
import type { QuireKitChatMessageActionProps } from '../../../components/chat';
import QuireButton from '../../button/button.vue';
import QuireIconButton from '../../button/icon-button.vue';
import QuireIcon from '../../icon/icon.vue';
import { QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from '../../tooltip';
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitChatMessageActionProps>(), { tooltip: true });
const emit = defineEmits<{ /** Requests execution of this available action. */ action: [id: string] }>();
const attrs = useAttrs();
const bindings = computed(() => ({ size: 'xs' as const, busy: props.action.busy ?? false, disabled: props.action.disabled ?? false,
  color: props.action.danger ? 'danger' as const : 'neutral' as const, variant: 'ghost' as const,
  'aria-pressed': props.action.pressed, 'data-emphasis': props.action.danger ? 'danger' : 'muted',
  'data-action-id': props.action.id, class: 'qk-chat-action' }));

/** Prevents repeat activation while a command is unavailable. */
function activate(): void {
  if (!props.action.busy && !props.action.disabled) emit('action', props.action.id);
}
</script>

<template>
  <QuireTooltipRoot v-if="action.icon && tooltip" :trigger-id="typeof attrs.id === 'string' ? attrs.id : undefined">
    <QuireTooltipTrigger as-child>
      <QuireIconButton v-bind="mergeProps(bindings, $attrs)" :label="action.label" @click="activate"><QuireIcon class="qk-chat-action__icon" :name="action.icon" /></QuireIconButton>
    </QuireTooltipTrigger>
    <QuireTooltipContent :content="action.label" />
  </QuireTooltipRoot>
  <QuireIconButton v-else-if="action.icon" v-bind="mergeProps(bindings, $attrs)" :label="action.label" @click="activate"><QuireIcon class="qk-chat-action__icon" :name="action.icon" /></QuireIconButton>
  <QuireButton v-else v-bind="mergeProps(bindings, $attrs)" @click="activate">{{ action.label }}</QuireButton>
</template>
