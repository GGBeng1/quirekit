<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { QuireTabs } from "../../tabs";
import { useQuireKitMessages } from "../../locale-provider/context";
import type { QuireKitProsePreviewMode, QuireKitProsePreviewProps, QuireKitProsePreviewSlots } from "./types";
const props = withDefaults(defineProps<QuireKitProsePreviewProps>(), { defaultValue: "preview", overflow: "hidden" });
const text = useQuireKitMessages("prose");
const slots = defineSlots<QuireKitProsePreviewSlots>();
const value = defineModel<QuireKitProsePreviewMode>();
const current = computed(() => value.value ?? props.defaultValue);
const sourceOpened = ref(false);
// Keep content ownership separate from the Tabs panel shell: preview remains
// mounted; expensive source is created on first access and survives later visits.
watch(current, next => { if (next === "source") sourceOpened.value = true; }, { immediate: true });
const items = computed(() => [{ value: "preview", label: text.value.preview }, { value: "source", label: text.value.source }]);
/** @param next - Next value from the shared Tabs controller. */
function update(next: string | undefined): void {
  if (next === "preview" || next === "source") value.value = next;
}
</script>
<template>
  <div class="qk-prose-preview" :style="{ overflow }" data-qk-not-prose data-qk-not-typography>
    <QuireTabs v-if="slots.source" :model-value="current" :items="items" :label="label ?? text.previewTabs" size="md" content-padding="none" @update:model-value="update">
      <template #content="{ item }">
        <div v-if="item.value === 'preview'" class="qk-prose-preview__content"><slot /></div>
        <div v-else-if="sourceOpened" class="qk-prose-preview__source"><slot name="source" /></div>
      </template>
    </QuireTabs>
    <div v-else class="qk-prose-preview__content"><slot /></div>
  </div>
</template>
