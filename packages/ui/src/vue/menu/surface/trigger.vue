<script setup lang="ts">
import { computed } from "vue";
import { ark } from "@ark-ui/vue/factory";
import { useMenuContext } from "@ark-ui/vue/menu";

const props = defineProps<{
  /** Merge the menu contract into the consumer's native control. */
  asChild?: boolean;
}>();
const menu = useMenuContext();
const upstream = computed(() => menu.value.getTriggerProps());
const bindings = computed<Record<string, unknown>>(() => ({ ...upstream.value, onPointerdown: pointerDown }));

/**
 * Preserves WebKit's native touch click while retaining the menu's mouse focus policy.
 * @param event - Original press; click and keyboard activation remain upstream-owned.
 */
function pointerDown(event: PointerEvent): void {
  if (event.pointerType !== "touch") upstream.value.onPointerdown?.(event);
}
</script>

<template>
  <ark.button v-bind="bindings" :as-child="props.asChild"><slot /></ark.button>
</template>
