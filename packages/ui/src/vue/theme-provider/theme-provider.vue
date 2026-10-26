<script setup lang="ts">
import { computed, provide, type PropType } from "vue";
import { quireKitThemeKey } from "./context";
import QuireThemeSurface from "./surface.vue";
import type { QuireKitTheme } from "../../theme/types";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  theme: {
    type: Object as PropType<QuireKitTheme>,
    required: true
  },
  surface: {
    type: Boolean,
    default: true
  }
});
provide(quireKitThemeKey, computed(() => props.theme));
</script>

<template>
  <QuireThemeSurface v-if="props.surface"><slot /></QuireThemeSurface>
  <slot v-else />
</template>
