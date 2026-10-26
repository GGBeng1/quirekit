<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed } from "vue";
import type { Editor } from "@quirekit/core";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { QuireIcon, QuireMenuItems, QuireMenuSeparator, QuireMenuSubmenu } from "@quirekit/ui/vue";
import type { BlockActionTarget } from "../../ui/blocks/types";
import { blockStructureMenuItems } from "../../ui/blocks/menu";
import BlockInsertList from "../insert/list.vue";
import { BLOCK_INSERT_MENU_WIDTH } from "../insert/layout";

const { t, localize, locale } = useBlockLocale();

const props = withDefaults(defineProps<{
  /** Canonical command owner. */ editor: Editor;
  /** Frozen block and revision shared by both insertion directions. */ target: BlockActionTarget | null;
  /** Feature-owned contextual operations preceding structural actions. */ contextItems?: readonly QuireKitMenuEntry[] | undefined;
}>(), { contextItems: () => [] });
const emit = defineEmits<{
  /** Contextual or structural leaf action. */ select: [value: string];
  /** An insertion was accepted or handed to its authoring panel. */ close: [];
}>();
const structure = computed(() => blockStructureMenuItems(props.target, locale.value));
</script>

<template>
  <QuireMenuItems :items="localize(contextItems)" :close-on-select="false" @select="emit('select', $event)" />
  <QuireMenuSeparator v-if="contextItems.length" />
  <template v-for="item in structure" :key="item.value">
    <QuireMenuSubmenu v-if="target && (item.value === 'before' || item.value === 'after')" :width="BLOCK_INSERT_MENU_WIDTH">
      <template #leading><QuireIcon :name="item.icon!" /></template>
      <template #trigger>{{ t(item.label) }}</template>
      <BlockInsertList :editor="editor" :destination="{ target: item.value === 'before' ? target.block : target.blocks[target.blocks.length - 1]!, side: item.value, expectedDocumentRevision: target.range.expectedDocumentRevision }" @close="emit('close')" />
    </QuireMenuSubmenu>
    <QuireMenuItems v-else :items="localize([item])" :close-on-select="false" @select="emit('select', $event)" />
  </template>
</template>
