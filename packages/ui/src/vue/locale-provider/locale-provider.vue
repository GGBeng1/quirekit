<script setup lang="ts">
import { computed, provide } from "vue";
import { resolveQuireKitLocale } from "../../locale/resolve";
import type { QuireKitLocaleProviderProps } from "./types";
import { quireKitLocaleKey } from "./context";

const props = withDefaults(defineProps<QuireKitLocaleProviderProps>(), { locale: "zh-CN", packs: () => [] });
provide(quireKitLocaleKey, computed(() => resolveQuireKitLocale(props.locale, props.packs)));
</script>

<template>
  <slot />
</template>
