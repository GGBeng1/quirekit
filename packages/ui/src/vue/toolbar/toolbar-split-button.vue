<script setup lang="ts">
import { computed, provide } from "vue";
import type { ButtonHTMLAttributes } from "vue";
import type {
  QuireKitToolbarPopup,
  QuireKitToolbarSplitOverlay,
  QuireKitToolbarToggleState
} from "../../components/toolbar/types";
import QuireIcon from "../icon/icon.vue";
import { quireKitEditorIconData } from "../../components/icon/catalog";
import QuireMenu from "../menu/menu.vue";
import QuirePopoverRoot from "../popover/root.vue";
import QuirePopoverTrigger from "../popover/trigger.vue";
import QuireToolbarDisclosure from "./toolbar-disclosure.vue";
import { useToolbarItem } from "./use-toolbar-item";
import { toolbarSplitDisclosureDisabledKey } from "./context";
import ToolbarTooltip from "./presentation/tooltip.vue";

/** Public properties for one two-target Toolbar Split Button. */
interface Props {
  /** Primary Tooltip explanation; defaults to actionLabel. */
  readonly actionTooltip?: string | false;
  /** Disclosure Tooltip explanation; defaults to disclosureLabel. */
  readonly disclosureTooltip?: string | false;
  /** Explanation shown while either target is unavailable. */
  readonly disabledReason?: string;
  /** Visible primary label beside the icon; omitted for an icon-only square target. */
  readonly text?: string;
  /** 整组按钮的可访问名称。 */
  readonly label: string;
  /** 主按钮的可访问名称。 */
  readonly actionLabel: string;
  /** Optional primary toggle state; omission preserves ordinary action semantics. */
  readonly pressed?: QuireKitToolbarToggleState;
  /** 展开按钮的可访问名称。 */
  readonly disclosureLabel: string;
  /** 右侧按钮展开的浮层类型。 */
  readonly popup?: QuireKitToolbarPopup;
  /** 右侧按钮组合的浮层类型。 */
  readonly overlay?: QuireKitToolbarSplitOverlay;
  /** DOM id of the controlled popup when available. */
  readonly controls?: string;
  /** 主按钮的原生表单提交类型。 */
  readonly type?: ButtonHTMLAttributes["type"];
  /** 是否禁用两侧按钮。 */
  readonly disabled?: boolean;
  /** 是否只禁用主按钮。 */
  readonly actionDisabled?: boolean;
  /** 是否只禁用展开按钮。 */
  readonly disclosureDisabled?: boolean;
  /** 关联主按钮说明或禁用原因的元素 id。 */
  readonly actionDescribedBy?: string;
  /** 关联展开按钮说明或禁用原因的元素 id。 */
  readonly disclosureDescribedBy?: string;
}

/** Public Split Button activation events. */
interface Emits {
  /** 执行主按钮时触发。 */
  readonly action: [event: MouseEvent];
  /** 点击展开按钮时触发，参数为请求的打开状态。 */
  readonly disclosure: [expanded: boolean];
}

/** Public Split Button slots. */
interface Slots {
  /** 主按钮内容，通常为图标或带文字的图标。 */
  readonly default: () => unknown;
  /** Optional QuireTooltipContent for the primary target, including host portal/theme attributes. */
  readonly actionTooltip?: () => unknown;
  /**
   * 自定义展开按钮，例如用于组合颜色选择器的 QuireToolbarColorPickerDisclosure。
   */
  readonly disclosure?: () => unknown;
  /** 自定义展开图标。 */
  readonly indicator?: () => unknown;
  /** 菜单条目或完整的 QuirePopoverContent。 */
  readonly overlay?: () => unknown;
}

const {
  label,
  actionLabel,
  pressed = undefined,
  disclosureLabel,
  popup = "menu",
  overlay = "custom",
  controls,
  type = "button",
  disabled = false,
  actionDisabled = false,
  disclosureDisabled = false,
  actionDescribedBy,
  disclosureDescribedBy,
  actionTooltip = undefined,
  disclosureTooltip = undefined,
  disabledReason,
  text
} = defineProps<Props>();
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const expanded = defineModel<boolean>("expanded", { default: false });
const actionUnavailable = () => disabled || actionDisabled;
const disclosureUnavailable = () => disabled || disclosureDisabled;
provide(toolbarSplitDisclosureDisabledKey, computed(disclosureUnavailable));
const actionItem = useToolbarItem(actionUnavailable);
const optionalDisclosureBindings = computed(() => ({
  ...(disclosureTooltip === undefined ? {} : { tooltip: disclosureTooltip }),
  ...(disabledReason === undefined ? {} : { disabledReason }),
  ...(controls === undefined ? {} : { controls }),
  ...(disclosureDescribedBy === undefined
    ? {}
    : { describedBy: disclosureDescribedBy })
}));

/**
 * Routes native activation only to the immediate action owner.
 *
 * @param event - Pointer, Enter, or Space activation event.
 */
function activateAction(event: MouseEvent): void {
  if (actionUnavailable()) {
    event.preventDefault();
    return;
  }
  emit("action", event);
}

/**
 * Projects the disclosure target's requested state without owning overlay behavior.
 *
 * @param next - Next open state requested by the disclosure target.
 */
function handleDisclosure(next: boolean): void {
  emit("disclosure", next);
}
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    :data-state="expanded ? 'open' : 'closed'"
    class="qk-toolbar__split"
    data-kind="split-button"
  >
    <ToolbarTooltip :trigger-id="actionItem.id" :label="actionLabel" :tooltip="actionTooltip" :disabled-reason="disabledReason"
      :subject-disabled="actionUnavailable()" :suppressed="expanded">
        <button
          :ref="(element) => { actionItem.element.value = element as HTMLButtonElement | null }"
          :type="type"
          :class="['qk-toolbar__item', 'qk-toolbar__split-target', text === undefined && 'qk-toolbar__split-target--icon']"
          :aria-label="actionLabel"
          :aria-pressed="pressed"
          :data-state="pressed === true || pressed === 'mixed' ? 'on' : 'off'"
          :data-mixed="pressed === 'mixed' ? '' : undefined"
          :aria-describedby="actionDescribedBy"
          :aria-disabled="actionUnavailable() ? 'true' : undefined"
          :tabindex="actionItem.tabIndex.value"
          :data-qk-toolbar-item="actionItem.id"
          data-part="action"
          @focus="actionItem.handleFocus"
          @click="activateAction"
        >
          <span v-if="$slots.default" class="qk-toolbar__icon"><slot /></span>
          <span v-if="text !== undefined" class="qk-toolbar__label">{{ text }}</span>
        </button>
      <template v-if="$slots.actionTooltip" #content><slot name="actionTooltip" /></template>
    </ToolbarTooltip>
    <slot v-if="$slots.disclosure" name="disclosure" />
    <QuireMenu
      v-else-if="overlay === 'menu'"
      v-model:open="expanded"
      :aria-label="disclosureLabel"
    >
      <template #trigger>
        <QuireToolbarDisclosure :toggle-on-click="false"
          v-model:expanded="expanded"
          class="qk-toolbar__split-disclosure"
          :label="disclosureLabel"
          popup="menu"
          v-bind="optionalDisclosureBindings"
          :disabled="disclosureUnavailable()"
          @activate="handleDisclosure"
        >
          <slot name="indicator"><QuireIcon :data="quireKitEditorIconData.chevronDown" /></slot>
        </QuireToolbarDisclosure>
      </template>
      <slot name="overlay" />
    </QuireMenu>
    <QuirePopoverRoot
      v-else-if="overlay === 'popover'"
      v-model:open="expanded"
    >
      <QuirePopoverTrigger as-child>
        <QuireToolbarDisclosure :toggle-on-click="false"
          v-model:expanded="expanded"
          class="qk-toolbar__split-disclosure"
          :label="disclosureLabel"
          popup="dialog"
          v-bind="optionalDisclosureBindings"
          :disabled="disclosureUnavailable()"
          @activate="handleDisclosure"
        >
          <slot name="indicator"><QuireIcon :data="quireKitEditorIconData.chevronDown" /></slot>
        </QuireToolbarDisclosure>
      </QuirePopoverTrigger>
      <slot name="overlay" />
    </QuirePopoverRoot>
    <QuireToolbarDisclosure
      v-else
      v-model:expanded="expanded"
      class="qk-toolbar__split-disclosure"
      :label="disclosureLabel"
      :popup="popup"
      v-bind="optionalDisclosureBindings"
      :disabled="disclosureUnavailable()"
      @activate="handleDisclosure"
    >
      <slot name="indicator"><QuireIcon :data="quireKitEditorIconData.chevronDown" /></slot>
    </QuireToolbarDisclosure>
  </div>
</template>
