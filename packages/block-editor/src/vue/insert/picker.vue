<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { ref, watch } from "vue";
import type { Editor } from "@quirekit/core";
import type { BlockSlotRef } from "@quirekit/extensions";
import { QuireMenu, QuireInput } from "@quirekit/ui/vue";
import BlockInsertList from "./list.vue";
import { BLOCK_INSERT_MENU_WIDTH } from "./layout";

const { t } = useBlockLocale();

const props = withDefaults(defineProps<{
  /** Canonical document session. */ editor: Editor;
  /** Captured slot for gutter insertion; omitted for the current selection. */ destination?: BlockSlotRef;
  /** Toolbar-controlled visibility; gutter hosts mount an already-open picker. */ open?: boolean;
}>(), { open: true });
const emit = defineEmits<{ close: []; "update:open": [open: boolean] }>();
defineSlots<{ trigger?: () => unknown }>();
const query = ref("");
watch(() => props.open, open => { if (open) query.value = ""; });
/** @param open - The shared Menu owns opening, dismissal and trigger focus. */
function changeOpen(open: boolean): void { emit("update:open", open); if (!open) emit("close"); }
</script>
<template>
  <QuireMenu :open="open" :portalled="!!$slots.trigger" :positioned="!!$slots.trigger" :typeahead="false" :close-on-select="false" :width="BLOCK_INSERT_MENU_WIDTH" max-width="calc(100vw - 32px)" :aria-label="t('插入内容块')" @update:open="changeOpen($event === true)">
    <template v-if="$slots.trigger" #trigger><slot name="trigger" /></template>
    <QuireInput v-model="query" :aria-label="t('搜索内容块')" :placeholder="t('搜索内容块…')" width="100%" autofocus />
    <BlockInsertList v-if="open" :editor="editor" :destination="destination" :query="query" @close="emit('close')" />
  </QuireMenu>
</template>
