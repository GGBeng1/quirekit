<script setup lang="ts">
import { ref } from "vue";
import { QuirePresetGallery, QuireSpace, QuireTabs } from "@quirekit/ui/vue";
import EditorListPreview from "./preview.vue";
import type { EditorListPresetItem, EditorListPresetScope } from "./types";
const props = defineProps<{
  /** Accessible gallery label. */
  readonly label: string;
  /** Canonical preset projections. */
  readonly items: readonly EditorListPresetItem[];
  /** Localized single/multilevel tabs. */
  readonly scopes: readonly EditorListPresetScope[];
  /** Applied preset identity, independent of keyboard browse focus. */
  readonly selected?: string | null;
}>();
const emit = defineEmits<{ select: [value: string] }>();
const activeScope = ref<string | undefined>(props.items.find(item => item.value === props.selected)?.scope ?? props.scopes[0]?.value);
</script>
<template>
  <QuireSpace class="qk-editor-list-gallery" orientation="vertical" gap="surfaceCompact" style="width: min(280px, calc(100vw - 64px)); max-width: 100%">
    <QuireTabs v-model="activeScope" :label="label" :items="scopes" lazy-mount unmount-on-exit content-padding="none">
      <template #content="{ item: tab }">
        <QuirePresetGallery :label="tab.label" hide-label :items="items.filter(item => item.scope === tab.value)"
          :model-value="selected ?? null" presentation="icons" :max-columns="3" min-item-width="88px"
          style="padding-block-start: var(--qk-space-surface-compact); --qk-listbox-max-height: min(380px, 36dvh)" @select="emit('select', $event)">
          <template #preview="{ item }"><EditorListPreview :lines="items.find(preset => preset.value === item.value)?.lines ?? []" :label="item.label" /></template>
        </QuirePresetGallery>
      </template>
    </QuireTabs>
    <slot />
  </QuireSpace>
</template>
