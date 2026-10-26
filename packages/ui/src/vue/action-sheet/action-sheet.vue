<script setup lang="ts">
import { computed, nextTick, ref, useId } from "vue";
import type { QuireKitActionSheetAction, QuireKitActionSheetIconSlotProps } from "../../components/action-sheet";
import type { QuireKitDrawerCloseRequest, QuireKitDrawerRootApi } from "../../components/drawer";
import { groupActionSheetActions } from "../../components/action-sheet/groups";
import QuireDrawerRoot from "../drawer/root.vue";
import QuireDrawerTrigger from "../drawer/trigger.vue";
import QuireDrawerContent from "../drawer/content.vue";
import QuireButton from "../button/button.vue";
import QuireIcon from "../icon/icon.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** 底部操作面板的属性。 */
interface Props {
  /** 面板的可见标题与可访问名称。 */
  readonly title: string;
  /** 标题下方的补充说明。 */
  readonly description?: string;
  /** 按显示顺序排列的动作，每项 value 必须唯一。 */
  readonly actions: readonly QuireKitActionSheetAction[];
  /** 受控打开状态；省略时由组件管理。 */
  readonly open?: boolean | undefined;
  /** 非受控模式的初始打开状态。 */
  readonly defaultOpen?: boolean;
  /** 选择动作后是否关闭；异步任务设为 false。 */
  readonly closeOnSelect?: boolean;
  /** 是否正在处理；期间禁止重复执行与用户关闭。 */
  readonly busy?: boolean;
  /** 操作失败的提示，显示后可以继续重试。 */
  readonly error?: string;
  /** 关闭后接收焦点的元素。 */
  readonly finalFocusEl?: () => HTMLElement | null;
  /** 关闭请求回调；同步调用 preventDefault() 可拒绝关闭，提供此回调时禁用拖动关闭。 */
  readonly onCloseRequest?: (request: QuireKitDrawerCloseRequest) => void;
}

/** 操作选择与打开状态事件。 */
interface Emits {
  /** 同步受控打开状态。 */
  "update:open": [open: boolean];
  /** 打开状态变化时触发。 */
  openChange: [open: boolean];
  /** 执行可用动作时触发，参数为动作 value。 */
  select: [value: string];
}

/** 操作面板的内容插槽。 */
interface Slots {
  /** 打开面板的单个按钮；通过程序打开时可以省略。 */
  readonly trigger?: () => unknown;
  /** 动作的装饰图标，不放置独立交互控件。 */
  readonly icon?: (props: QuireKitActionSheetIconSlotProps) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  open: undefined, defaultOpen: false, closeOnSelect: true, busy: false
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const text = useQuireKitMessages("actionSheet");
const drawer = ref<QuireKitDrawerRootApi>();
const instanceId = useId();
const localOpen = ref(props.defaultOpen);
const activating = ref(false);
const open = computed(() => props.open === undefined ? localOpen.value : props.open);
const groups = computed(() => groupActionSheetActions(props.actions));
// Only install a cancellable guard when needed, so ordinary sheets retain safe drag dismissal.
const guards = computed(() => props.busy || props.onCloseRequest ? { closeRequest: guardClose } : {});

/**
 * Retains one source of open state and projects accepted Drawer changes.
 * @param next - Accepted open state.
 */
function updateOpen(next: boolean): void {
  localOpen.value = next;
  emit("update:open", next);
  emit("openChange", next);
}

/**
 * Refuses dismissal during an in-flight host task, then lets the host apply its own policy.
 * @param request - Synchronous cancellable Drawer request.
 */
function guardClose(request: QuireKitDrawerCloseRequest): void {
  if (props.busy) request.preventDefault();
  props.onCloseRequest?.(request);
}

/**
 * Rechecks current action availability before handing execution to the host.
 * @param value - Stable value of the clicked action.
 */
async function activate(value: string): Promise<void> {
  const action = props.actions.find((item) => item.value === value);
  if (!open.value || !action || action.disabled || props.busy || activating.value) return;
  activating.value = true;
  try {
    emit("select", value);
    // Let synchronous host updates install busy/close guards before requesting dismissal.
    await nextTick();
    if (props.closeOnSelect) drawer.value?.requestClose("action");
  } finally {
    activating.value = false;
  }
}
</script>

<template>
  <QuireDrawerRoot ref="drawer" :open="open" side="bottom" :drag-enabled="!busy"
    v-bind="finalFocusEl ? { finalFocusEl } : {}" @update:open="updateOpen" v-on="guards">
    <QuireDrawerTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></QuireDrawerTrigger>
    <QuireDrawerContent :title="title" :description="description ?? ''" :show-close="false" size="medium">
      <div class="qk-action-sheet" :aria-busy="busy || undefined">
        <section v-for="(group, index) in groups" :key="index" class="qk-action-sheet__group"
          :aria-labelledby="group.label ? `${instanceId}-group-${index}` : undefined">
          <h3 v-if="group.label" :id="`${instanceId}-group-${index}`" class="qk-action-sheet__group-label">{{ group.label }}</h3>
          <button v-for="action in group.actions" :key="action.value" type="button" class="qk-action-sheet__action"
            :data-danger="action.danger || undefined" :disabled="action.disabled"
            :aria-disabled="busy || undefined" @click="activate(action.value)">
            <span v-if="action.icon || $slots.icon" class="qk-action-sheet__icon" aria-hidden="true">
              <slot name="icon" :action="action"><QuireIcon v-if="action.icon" :name="action.icon" :size="20" /></slot>
            </span>
            <span class="qk-action-sheet__copy">
              <span class="qk-action-sheet__label">{{ action.label }}</span>
              <span v-if="action.description" class="qk-action-sheet__description">{{ action.description }}</span>
            </span>
          </button>
        </section>
        <p v-if="!actions.length" class="qk-action-sheet__empty">{{ text.empty }}</p>
      </div>
      <template #footer>
        <div class="qk-action-sheet__footer">
          <p v-if="busy" role="status" class="qk-action-sheet__status">{{ text.busy }}</p>
          <p v-else-if="error" role="alert" class="qk-action-sheet__error">{{ error }}</p>
          <QuireButton variant="text" class="qk-action-sheet__cancel" :aria-disabled="busy || undefined"
            @click="drawer?.requestClose('cancel')">{{ text.cancel }}</QuireButton>
        </div>
      </template>
    </QuireDrawerContent>
  </QuireDrawerRoot>
</template>
