<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from "vue";
import { QuireLocaleProvider } from "@quirekit/ui/vue";
import type { BlockEditorProps, BlockEditorSlots } from "./types";
import BlockWorkspace from "./workspace.vue";
const props = defineProps<BlockEditorProps>();
defineSlots<BlockEditorSlots>();
const emit = defineEmits<{ "update:title": [title: string]; change: [] }>();
const locale = shallowRef(props.instance.locale);
const release = props.instance.onLocaleChange(value => { locale.value = value; });
onBeforeUnmount(release);
</script>
<template>
  <QuireLocaleProvider :locale="locale">
    <BlockWorkspace :instance="instance" :title="title" @update:title="emit('update:title', $event)" @change="emit('change')">
      <template #header-actions><slot name="header-actions" /></template>
      <template #tools="context"><slot name="tools" v-bind="context" /></template>
    </BlockWorkspace>
  </QuireLocaleProvider>
</template>
