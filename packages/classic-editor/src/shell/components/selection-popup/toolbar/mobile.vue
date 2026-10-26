<script setup lang="ts">
import { computed } from "vue";
import { QuireToolbar } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry, QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent } from "@quirekit/ui";

const props = defineProps<{
  /** Compact actions and the menu of complete settings; no desktop control factories. */
  items: readonly QuireKitToolbarEntry[];
  /** Localized accessible toolbar name. */
  label: string;
}>();
const emit = defineEmits<{
  /** Existing action pipeline retains clipboard, selection and focus ownership. */
  execute: [event: QuireKitToolbarExecuteEvent];
  /** More remains a child of the shared anchored surface. */
  openChange: [event: QuireKitToolbarOpenChangeEvent];
}>();
const rows = computed(() => [{ value: "compact", label: props.label, items: props.items }]);
</script>

<template>
  <QuireToolbar :rows="rows" :label="label" mode="mobile" variant="elevated" align="start" preserve-focus
    @execute="emit('execute', $event)" @open-change="emit('openChange', $event)" />
</template>
