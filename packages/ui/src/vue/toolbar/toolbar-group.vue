<script setup lang="ts">
import { inject } from "vue";
import { toolbarContextKey } from "./context";

/** Public properties for one semantic Toolbar group. */
interface Props {
  /** Accessible group name when several actions share one task. */
  readonly label?: string;
}

/** Public slots for one semantic Toolbar group. */
interface Slots {
  /** Related Toolbar actions rendered in DOM order. */
  readonly default: () => unknown;
}

const { label } = defineProps<Props>();
defineSlots<Slots>();
const context = inject(toolbarContextKey);
if (context === undefined) {
  throw new Error("Toolbar groups must be rendered inside QuireKit Toolbar");
}
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    :class="[
      'qk-toolbar__group',
      `qk-toolbar__group--${context.orientation.value}`
    ]"
  >
    <slot />
  </div>
</template>
