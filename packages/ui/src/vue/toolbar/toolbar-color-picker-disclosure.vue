<script setup lang="ts">
import ToolbarTooltip from "./presentation/tooltip.vue";
import { ColorPicker, useColorPickerContext } from "@ark-ui/vue/color-picker";
import { computed, inject } from "vue";
import { useToolbarItem } from "./use-toolbar-item";
import { toolbarSplitDisclosureDisabledKey } from "./context";

/** Public properties for a Color Picker trigger in a Toolbar Split Button. */
interface Props {
  /** Tooltip explanation; defaults to the accessible label. */
  readonly tooltip?: string | false;
  /** Reason displayed while this control is unavailable. */
  readonly disabledReason?: string;
  /** Accessible action name for the color disclosure. */
  readonly label: string;
  /** 是否禁用执行与方向键聚焦；同时继承所在 Split Button 和 Color Picker 的禁用状态。 */
  readonly disabled?: boolean;
  /** Optional description element for a disabled reason. */
  readonly describedBy?: string;
}

/** Public slots for the Toolbar Color Picker disclosure. */
interface Slots {
  /** Disclosure artwork, normally a directional QuireIcon. */
  readonly default: () => unknown;
}

const { label, disabled = false, describedBy, tooltip = undefined, disabledReason } = defineProps<Props>();
defineSlots<Slots>();
defineOptions({ inheritAttrs: false });
const picker = useColorPickerContext();
const splitDisabled = inject(toolbarSplitDisclosureDisabledKey, undefined);
const unavailable = computed(() => disabled || splitDisabled?.value === true
  || Boolean(picker.value.getSwatchTriggerProps({ value: picker.value.value }).disabled));
const item = useToolbarItem(() => unavailable.value);

/**
 * Registers the native Ark trigger button instead of its Vue component proxy.
 *
 * @param element - Template ref value exposed by the Ark Trigger component.
 */
function bindTriggerElement(element: unknown): void {
  if (element instanceof HTMLButtonElement) {
    item.element.value = element;
    return;
  }
  const componentRoot = typeof element === "object"
    && element !== null
    && "$el" in element
    ? element.$el
    : null;
  item.element.value = componentRoot instanceof HTMLButtonElement
    ? componentRoot
    : null;
}

/**
 * Prevents the Color Picker machine from opening through a disabled target.
 *
 * @param event - Native disclosure click captured before Ark handles it.
 */
function guardDisabledActivation(event: MouseEvent): void {
  if (!unavailable.value) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}
</script>

<template>
  <ToolbarTooltip :trigger-id="picker.getTriggerProps().id" :label="label" :tooltip="tooltip" :disabled-reason="disabledReason" :subject-disabled="unavailable" :suppressed="picker.open">
  <ColorPicker.Trigger
    v-bind="$attrs"
    :title="undefined"
    :ref="bindTriggerElement"
    type="button"
    class="qk-toolbar__item qk-toolbar__icon-button"
    :aria-label="label"
    :aria-describedby="describedBy"
    :aria-disabled="unavailable ? 'true' : undefined"
    :tabindex="item.tabIndex.value"
    :data-qk-toolbar-item="item.id"
    data-kind="color-picker-disclosure"
    @focus="item.handleFocus"
    @click.capture="guardDisabledActivation"
  >
    <span class="qk-toolbar__icon" aria-hidden="true"><slot /></span>
  </ColorPicker.Trigger>
  </ToolbarTooltip>
</template>
