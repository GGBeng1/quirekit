<script setup lang="ts">
import { ark } from "@ark-ui/vue/factory";
import type { ButtonHTMLAttributes } from "vue";
import type {
  QuireKitButtonColor,
  QuireKitButtonSize,
  QuireKitButtonVariant,
  QuireKitIconButtonShape
} from "../../components/button";

const ArkButton = ark.button;

/** Public properties for the Vue IconButton adapter. */
interface Props {
  /** Accessible action name; icon-only buttons never infer this from artwork. */
  readonly label: string;
  /** Native button submission behavior. */
  readonly type?: ButtonHTMLAttributes["type"];
  /** Public component size. */
  readonly size?: QuireKitButtonSize;
  /** Shape of the target; rounded preserves the size-specific control radius. */
  readonly shape?: QuireKitIconButtonShape;
  /** Semantic color family used to communicate the action role. */
  readonly color?: QuireKitButtonColor;
  /** Paint treatment applied to the semantic color. */
  readonly variant?: Exclude<QuireKitButtonVariant, "link">;
  /** Whether activation is unavailable. */
  readonly disabled?: boolean;
  /** Whether the action is currently processing. */
  readonly busy?: boolean;
}

const {
  type = "button",
  size = "sm",
  shape = "rounded",
  color = "neutral",
  variant = "ghost",
  disabled = false,
  busy = false
} = defineProps<Props>();
</script>

<template>
  <component
    :is="ArkButton"
    :type="type"
    data-scope="button"
    data-part="root"
    :aria-label="label"
    :aria-busy="busy || undefined"
    :disabled="disabled || busy"
    :data-state="busy ? 'busy' : undefined"
    :class="[
      'qk-button',
      'qk-icon-button',
      `qk-button--${color}-${variant}`,
      `qk-icon-button--${size}`,
      shape === 'circle' && 'qk-icon-button--circle'
    ]"
  >
    <span
      :class="['qk-button__icon', `qk-button__icon--${size}`]"
      aria-hidden="true"
      data-slot="icon"
    >
      <svg
        v-if="busy"
        class="qk-button__spinner"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M20 12a8 8 0 0 1-8 8" />
        <path d="M4 12a8 8 0 0 1 8-8" opacity=".35" />
      </svg>
      <slot v-else />
    </span>
  </component>
</template>
