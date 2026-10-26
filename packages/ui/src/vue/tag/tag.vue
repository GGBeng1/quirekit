<script setup lang="ts">
import { useId } from "vue";
import type { QuireKitTagColor, QuireKitTagSize, QuireKitTagVariant } from "../../components/tag";
import QuireIcon from "../icon/icon.vue";
import QuireIconButton from "../button/icon-button.vue";
import { useQuireKitMessages } from "../locale-provider/context";
/** Category or status content with an optional, independently operable removal action. */
interface Props {
  /** Existing semantic color family. */
  readonly color?: QuireKitTagColor;
  /** Quiet fill, tinted outline, outline or strong fill. */
  readonly variant?: QuireKitTagVariant;
  /** Typography and padding density; removal retains the compact button target. */
  readonly size?: QuireKitTagSize;
  /** Accessible wording for abbreviated content. */
  readonly label?: string;
  /** Optional decorative leading icon from the active registry. */
  readonly icon?: string;
  /** Show a removal button; emitting close never removes this component itself. */
  readonly closable?: boolean;
  /** Disable only the removal action, without changing the meaning of the label. */
  readonly disabled?: boolean;
  /** Truncate text to one line while retaining its full accessible content. */
  readonly truncate?: boolean;
  /** Host layout constraint, expressed as a CSS width and capped by the container. */
  readonly maxWidth?: string;
}
const props = withDefaults(defineProps<Props>(), {
  color: "neutral", variant: "soft", size: "sm", closable: false,
  disabled: false, truncate: false
});
const emit = defineEmits<{
  /** Requests removal; the parent owns validation, list mutation and subsequent focus. */
  close: [event: MouseEvent];
}>();
defineSlots<{
  /** Category or status text. */
  default?: () => unknown;
  /** Decorative leading content, replacing the icon prop when provided. */
  leading?: () => unknown;
  /** Decorative trailing content, before the dedicated removal action. */
  trailing?: () => unknown;
}>();
const text = useQuireKitMessages("tag");
const contentId = `qk-tag-${useId()}-content`;
/**
 * Requests removal without toggling an enclosing clickable region or changing visibility.
 * @param event - Activation of the native button, including keyboard-generated clicks.
 */
function requestClose(event: MouseEvent): void {
  if (!props.disabled) emit("close", event);
}
</script>
<template>
  <span
    :class="['qk-tag', `qk-tag--${color}`, `qk-tag--${variant}`, `qk-tag--${size}`, { 'qk-tag--closable': closable }]"
    :style="maxWidth ? { maxWidth: `min(100%, ${maxWidth})` } : undefined"
  >
    <span v-if="$slots.leading || icon" class="qk-tag__decoration" aria-hidden="true">
      <slot name="leading"><QuireIcon :name="icon" :size="size === 'md' ? 16 : 12" /></slot>
    </span>
    <span :id="label ? undefined : contentId" :aria-hidden="label ? true : undefined" :class="['qk-tag__content', { 'qk-tag__content--truncate': truncate }]"><slot /></span>
    <span v-if="label" :id="contentId" class="sr-only">{{ label }}</span>
    <span v-if="$slots.trailing" class="qk-tag__decoration" aria-hidden="true"><slot name="trailing" /></span>
    <QuireIconButton
      v-if="closable"
      :class="['qk-tag__close', { 'qk-tag__close--solid': variant === 'solid' }]"
      size="xs"
      :color="color"
      variant="text"
      :label="text.remove"
      :aria-describedby="contentId"
      :disabled="disabled"
      @click.stop="requestClose"
    ><QuireIcon name="close" :size="12" /></QuireIconButton>
  </span>
</template>
