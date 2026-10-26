<script setup lang="ts">
import { computed, inject } from "vue";
import { toolbarContextKey } from "./context";

const context = inject(toolbarContextKey);
if (context === undefined) {
  throw new Error("Toolbar separators must be rendered inside QuireKit Toolbar");
}
const orientation = computed(() => (
  context.orientation.value === "horizontal" ? "vertical" : "horizontal"
));
</script>

<template>
  <span
    role="separator"
    :aria-orientation="orientation"
    :class="['qk-toolbar__separator', `qk-toolbar__separator--${orientation}`]"
  />
</template>
