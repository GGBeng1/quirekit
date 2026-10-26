<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import type { QuireKitChatAction, QuireKitChatActionDetails, QuireKitChatMessageActionsProps } from '../../../components/chat';
import type { QuireKitMenuEntry } from '../../../components/menu';
import type { QuireKitClipboardErrorDetails } from '../../../components/clipboard';
import QuireChatMessageAction from '../message-action/message-action.vue';
import QuireClipboard from '../../clipboard/clipboard.vue';
import QuireMenu from '../../menu/menu.vue';
import { useQuireKitMessages } from '../../locale-provider/context';
import { vChatFocusRecovery } from '../shared/focus-recovery';
import LocaleScope from '../shared/locale-scope.vue';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitChatMessageActionsProps>(), { state: 'complete', visibility: 'always', latest: true });
const emit = defineEmits<{
  /** 请求宿主执行命令。 */
  action: [details: QuireKitChatActionDetails];
  /** 完成系统剪贴板写入。 */
  copy: [];
  /** 复制写入失败。 */
  copyError: [details: QuireKitClipboardErrorDetails];
}>();
const text = useQuireKitMessages('chat');
const labels = computed(() => text.value.message);
const root = shallowRef<HTMLElement | null>(null);
const active = computed(() => props.state === 'pending' || props.state === 'streaming');
const available = computed(() => props.actions?.filter(action => action.when === 'always' || (action.when === 'active' ? active.value : !active.value)) ?? []);
const inline = computed(() => available.value.filter(action => action.placement !== 'more' || action.pressed !== undefined));
const essential = computed(() => available.value.some(action => action.when === 'always' || action.when === 'active') || props.state === 'error');
const reveal = computed(() => !essential.value && (props.visibility === 'hover' || (props.visibility === 'auto' && !props.latest)));
const more = computed<QuireKitMenuEntry[]>(() => available.value.filter(action => action.placement === 'more' && action.pressed === undefined).map(action => ({
  value: action.id, label: action.label, disabled: !!(action.disabled || action.busy),
  ...(action.icon ? { icon: action.icon } : {}), ...(action.danger ? { tone: 'danger' as const } : {})
})));

/** Dispatches an available command without claiming business success.
 * @param action - Current action configuration, rechecked at activation time.
 */
function dispatch(action: QuireKitChatAction): void {
  if (action.disabled || action.busy || !available.value.includes(action)) return;
  emit('action', { actionId: action.id, ...(props.messageId === undefined ? {} : { messageId: props.messageId }), ...(props.partId === undefined ? {} : { partId: props.partId }) });
}

/** Delivers the selected command intent without owning its execution.
 * @param value - Menu command identity.
 */
function dispatchMore(value: string): void {
  const action = available.value.find(item => item.id === value && item.placement === 'more');
  if (action) dispatch(action);
}
</script>

<template>
  <LocaleScope v-slot="{ dir }">
  <div ref="root" v-chat-focus-recovery v-bind="$attrs" class="qk-chat-actions" :dir="dir" :data-reveal="reveal || undefined" tabindex="-1">
    <QuireClipboard v-if="copyText !== undefined && !active" :value="copyText" mode="icon" variant="text"
      @status-change="emit('copy')" @copy-error="emit('copyError', $event)">
      <template #control="control"><QuireChatMessageAction
        :action="{ id: 'copy', label: control.error ? labels.copyError : control.copied ? labels.copied : labels.copy, icon: control.copied ? 'check' : 'copy', disabled: control.disabled }"
        :aria-describedby="control.describedBy" :aria-busy="control.copying || undefined" :aria-disabled="control.copying || undefined" @action="control.copy" /></template>
    </QuireClipboard>
    <QuireChatMessageAction v-for="action in inline" :key="action.id" :action="action" @action="dispatch(action)" />
    <QuireMenu v-if="more.length" :aria-label="labels.more" :items="more" width="auto" max-width="16rem" @select="dispatchMore">
      <template #trigger><QuireChatMessageAction :action="{ id: 'more', label: labels.more, icon: 'moreHorizontal' }" :tooltip="false" /></template>
    </QuireMenu>
  </div>
  </LocaleScope>
</template>
