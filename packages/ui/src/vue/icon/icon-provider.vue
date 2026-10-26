<script setup lang="ts">
import { computed, provide } from "vue";
import type { QuireKitIconRegistry } from "../../components/icon";
import { quireKitIconRegistryKey } from "./context";

/** Public properties for one scoped icon registry provider. */
interface Props {
  /** Product-owned icon registry available to descendant QuireIcon instances. */
  readonly registry: QuireKitIconRegistry;
}

const props = defineProps<Props>();
const registry = computed(() => props.registry);
provide(quireKitIconRegistryKey, registry);
</script>

<template>
  <slot />
</template>
