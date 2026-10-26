<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import type { ChatDisclosureProps } from './types';
import QuireCollapsible from '../../collapsible/collapsible.vue';
import QuireIcon from '../../icon/icon.vue';
import QuireShimmer from '../../shimmer/shimmer.vue';
import LocaleScope from './locale-scope.vue';
import { stateIcon } from './state-icon';
import { useQuireKitMessages } from '../../locale-provider/context';
import { vChatFocusRecovery } from './focus-recovery';
defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<ChatDisclosureProps>(), { open: undefined, defaultOpen: false, state: 'complete' });
const emit = defineEmits<{ /** Requests controlled disclosure acknowledgement. */ 'update:open': [value: boolean] }>();
defineSlots<{ /** Full detail content, kept mounted when closed. */ default?: () => unknown; /** Critical actions stay outside the closed detail region. */ actions?: () => unknown }>();
const root = shallowRef<HTMLElement | null>(null);
const localOpen = ref(props.defaultOpen);
const settled = computed(() => props.state === 'complete' || props.state === 'succeeded');
const active = computed(() => ['queued', 'running', 'streaming', 'pending'].includes(props.state));
const text = useQuireKitMessages('chat');
const status = computed(() => props.stateLabel ?? text.value.status[props.state]);
watch(() => props.processId, () => { localOpen.value = props.defaultOpen; });

/** Records UI choice without changing execution state.
 * @param value - Requested disclosure state.
 */
function updateOpen(value: boolean | undefined): void {
  if (value === undefined) return;
  localOpen.value = value;
  emit('update:open', value);
}
</script>

<template>
  <LocaleScope v-slot="{ dir }">
    <div ref="root" v-chat-focus-recovery v-bind="$attrs" class="qk-chat-process" :dir="dir" :data-process-id="processId" :data-state="state" tabindex="-1">
      <QuireCollapsible :key="processId" :title="title" variant="plain" trigger-variant="text" indicator-placement="inline" :open="open ?? localOpen" @update:open="updateOpen">
        <template #trigger>
          <span class="qk-chat-process__summary" :data-state="state">
            <QuireIcon v-if="(!settled && !active) || icon" :name="!settled && !active ? stateIcon(state) : icon!" :size="16" />
            <span class="qk-chat-process__title" :title="title" dir="auto">{{ title }}</span>
            <span v-if="summary" class="qk-chat-process__preview" :title="summary" dir="auto">{{ summary }}</span>
            <QuireShimmer v-if="active" class="qk-chat-process__state" :text="status" :title="status" dir="auto" />
            <span v-else-if="!settled" class="qk-chat-process__state" :title="status" dir="auto">{{ status }}</span>
            <span v-else class="sr-only">{{ status }}</span>
            <span v-if="meta" class="qk-chat-process__meta" :title="meta" dir="auto">{{ meta }}</span>
          </span>
        </template>
        <div :class="['qk-chat-process__details', contentLayout === 'steps' ? 'qk-chat-process__details--steps' : 'qk-chat-process__details--detail']"><slot /></div>
      </QuireCollapsible>
      <div v-if="$slots.actions" class="qk-chat-process__attention"><slot name="actions" /></div>
    </div>
  </LocaleScope>
</template>
