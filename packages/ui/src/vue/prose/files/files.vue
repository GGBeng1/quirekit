<script setup lang="ts">
import { computed } from "vue";
import QuireSelect from "../../select/select.vue";
import QuireSpace from "../../space/space.vue";
import { useQuireKitMessages } from "../../locale-provider/context";
import type { QuireKitProseFilesProps, QuireKitProseFilesSlots } from "./types";

const props = defineProps<QuireKitProseFilesProps>();
defineSlots<QuireKitProseFilesSlots>();
const value = defineModel<string>();
const text = useQuireKitMessages("prose");
const current = computed(() => props.files.find(file => file === value.value) ?? props.files[0]);
const items = computed(() => props.files.map(file => ({ value: file, label: file })));
</script>

<template>
  <QuireSpace orientation="vertical" gap="inline" block data-qk-prose-files data-qk-not-prose data-qk-not-typography>
    <QuireSelect v-if="files.length > 1 && current" :items="items" :model-value="current" :label="label ?? text.sourceFile" width="100%" @update:model-value="value = $event" />
    <div v-if="current" :key="current" :data-source-file="current"><slot :file="current" /></div>
  </QuireSpace>
</template>
