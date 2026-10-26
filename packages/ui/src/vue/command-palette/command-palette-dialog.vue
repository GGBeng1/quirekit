<script setup lang="ts">
import { computed, ref } from 'vue';
import { QuireDialogRoot, QuireDialogContent, QuireDialogTrigger } from '../dialog';
import QuireCommandPalette from './command-palette.vue';
import type { CommandPaletteDialogSlots, QuireKitCommandPaletteDialogProps, QuireKitCommandPaletteItem } from './types';
const props = withDefaults(defineProps<QuireKitCommandPaletteDialogProps>(), { defaultOpen: false });
const emit = defineEmits<{ 'update:open': [open: boolean]; 'update:search': [search: string]; select: [item: QuireKitCommandPaletteItem]; retry: [] }>();
defineSlots<CommandPaletteDialogSlots>();
const localOpen = ref(props.defaultOpen);
const visible = computed(() => props.open ?? localOpen.value);
const palette = ref<InstanceType<typeof QuireCommandPalette>>();
const query = ref(props.defaultSearch ?? '');
const search = computed(() => props.search ?? query.value);
const paletteProps = computed(() => {
  const { title: _title, description: _description, open: _open, defaultOpen: _defaultOpen, finalFocusEl: _finalFocusEl, ...rest } = props;
  return rest;
});
/** @param open - Dialog's next visibility. */
function updateOpen(open: boolean): void { localOpen.value = open; emit('update:open', open); }
/** @param value - Query survives Dialog content unmounts. */
function updateSearch(value: string): void { query.value = value; emit('update:search', value); }
/** @returns Search input used by Ark's modal focus trap. */
function initialFocusEl(): HTMLElement | null { return palette.value?.getInputElement() ?? null; }
/** @param event - Dialog Escape; composition cancellation belongs to the IME. */
function escape(event: KeyboardEvent): void {
  if (event.isComposing || event.keyCode === 229) { event.preventDefault(); return; }
  updateOpen(false);
}
</script>
<template>
  <QuireDialogRoot :open="visible" :initial-focus-el="initialFocusEl" :close-on-escape="false" v-bind="finalFocusEl ? { finalFocusEl } : {}" @update:open="updateOpen" @escape-key-down="escape">
    <QuireDialogTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></QuireDialogTrigger>
    <QuireDialogContent :title="title" v-bind="description === undefined ? {} : { description }" size="medium">
      <QuireCommandPalette ref="palette" v-bind="paletteProps" :search="search" @update:search="updateSearch" @select="emit('select', $event)" @retry="emit('retry')">
        <template v-if="$slots.leading" #leading="context"><slot name="leading" v-bind="context" /></template>
        <template v-if="$slots.trailing" #trailing="context"><slot name="trailing" v-bind="context" /></template>
        <template v-if="$slots.footer" #footer><slot name="footer" /></template>
      </QuireCommandPalette>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
