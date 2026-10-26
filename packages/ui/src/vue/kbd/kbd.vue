<script setup lang="ts">
import { computed } from "vue";
import type { QuireKitKbdSize } from "../../components/kbd";
import { keyLabel } from "./labels";
/** Keyboard hints display a shortcut; they never register its action. */
interface Props {
  /** Explicit keys in reading order; the host chooses platform conventions. */
  readonly keys: readonly string[];
  /** Localized accessible shortcut description. */
  readonly label?: string;
  /** Independent xs/sm/md keycap size; does not inherit button size. */
  readonly size?: QuireKitKbdSize;
}
const props = withDefaults(defineProps<Props>(), { size: "sm" });
const accessible = computed(() => props.label ?? keyLabel(props.keys));
</script>
<template>
  <kbd :class="['qk-kbd', `qk-kbd--${size}`]"><span aria-hidden="true">{{ keys.join(' + ') }}</span><span class="sr-only">{{ accessible }}</span></kbd>
</template>
