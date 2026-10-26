<script setup lang="ts">
import { computed, inject, onBeforeUnmount, watch } from "vue";
import { ark } from "@ark-ui/vue/factory";
import { useTooltipContext } from "@ark-ui/vue/tooltip";
import { forwardTooltipFocus, tooltipFocusPolicyKey } from "./focus-reveal";

/** Tooltip Trigger 的公开属性。 */
interface Props {
  /** 是否将提示行为合并到插槽中的唯一子元素。 */
  readonly asChild?: boolean;
  /** 多 trigger 组合中标识当前 trigger 的稳定值。 */
  readonly value?: string;
}

/** Tooltip Trigger 的组合插槽。 */
interface Slots {
  /** 接收 pointer、focus 与 ARIA 行为的唯一触发元素。 */
  readonly default: () => unknown;
}

const { asChild = false, value } = defineProps<Props>();
defineSlots<Slots>();

const context = useTooltipContext();
const policy = inject(tooltipFocusPolicyKey, { closeOnScroll: true, disabled: false, open: undefined });
let cancelFocus: (() => void) | undefined;
const upstreamBindings = computed(() => context.value.getTriggerProps(value === undefined ? {} : { value }));
const triggerBindings = computed<Record<string, unknown>>(() => ({ ...upstreamBindings.value, onFocusin: focus }));

watch(() => [policy.open, policy.disabled] as const, ([open, disabled], [previous]) => {
  if (disabled || (open === false && previous !== false)) cancelFocus?.();
}, { flush: "sync" });
onBeforeUnmount(() => cancelFocus?.());

/**
 * Allows native keyboard-focus scrolling to finish before Ark installs scroll dismissal.
 * @param event - The original bubbling focus event; never replaced or redispatched.
 */
function focus(event: FocusEvent): void {
  cancelFocus?.();
  if (policy.disabled || !policy.closeOnScroll) forwardFocus(event);
  else cancelFocus = forwardTooltipFocus(event, forwardFocus);
}

/**
 * Delegates focus to the current upstream API, including controlled and disabled checks.
 * @param event - The original focus event retained during native scrolling.
 */
function forwardFocus(event: FocusEvent): void {
  (upstreamBindings.value.onFocusin as ((event: FocusEvent) => void) | undefined)?.(event);
}
</script>

<template>
  <ark.button
    v-bind="triggerBindings"
    :as-child="asChild"
    data-scope="tooltip"
    data-part="trigger"
  >
    <slot />
  </ark.button>
</template>
