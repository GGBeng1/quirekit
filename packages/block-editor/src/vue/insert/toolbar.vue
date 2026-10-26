<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed } from "vue";
import { QuireIcon, QuireToolbarDisclosure, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { BlockToolbarProps } from "../types";
import BlockInsertPicker from "./picker.vue";

const { t } = useBlockLocale();

const props = defineProps<{ /** Shared toolbar lifecycle and product context. */ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as BlockToolbarProps);
</script>

<template>
  <BlockInsertPicker :editor="context.editor" :open="scope.expanded" @update:open="scope.setExpanded" @close="scope.setExpanded(false)">
    <template #trigger>
      <QuireToolbarDisclosure :toggle-on-click="false" :label="t(scope.item.label)" :text="scope.item.text ?? scope.item.label" popup="menu"
        :expanded="scope.expanded" :disabled="scope.disabled" @update:expanded="scope.setExpanded">
        <QuireIcon :name="scope.item.icon" />
      </QuireToolbarDisclosure>
    </template>
  </BlockInsertPicker>
</template>
