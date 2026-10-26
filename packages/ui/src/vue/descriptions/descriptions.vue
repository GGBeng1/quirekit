<script setup lang="ts">
import { useId } from 'vue';
import type { QuireKitDescriptionItem, QuireKitDescriptionsProps } from './types';
withDefaults(defineProps<QuireKitDescriptionsProps>(), {
  titleAs: 'h3', columns: 2, orientation: 'horizontal', variant: 'plain',
  density: 'regular', labelWidth: '8em', emptyValue: '—'
});
defineSlots<{
  /** Replaces title text within the configured heading. */
  title?: () => unknown;
  /** Independent header actions; no wrapper is created when absent. */
  trailing?: () => unknown;
  /** Enriches each item's name without changing dt semantics. */
  label?: (props: { item: QuireKitDescriptionItem; index: number }) => unknown;
  /** Replaces each value with consumer-owned content or controls. */
  value?: (props: { item: QuireKitDescriptionItem; index: number }) => unknown;
}>();
const titleId = `qk-descriptions-${useId()}-title`;
</script>
<template>
  <div class="qk-descriptions" data-qk-not-prose>
    <div v-if="title || $slots.title || $slots.trailing" class="qk-descriptions__header">
      <component :is="titleAs" v-if="title || $slots.title" :id="titleId" class="qk-descriptions__title"><slot name="title">{{ title }}</slot></component>
      <div v-if="$slots.trailing" class="qk-descriptions__trailing"><slot name="trailing" /></div>
    </div>
    <dl class="qk-descriptions__list" :data-columns="columns" :data-orientation="orientation"
      :data-variant="variant" :data-density="density" :style="{ '--qk-descriptions-label-width': labelWidth }"
      :aria-labelledby="title || $slots.title ? titleId : undefined" :aria-label="title || $slots.title ? undefined : label">
      <div v-for="(item, index) in items" :key="item.key" class="qk-descriptions__item" :data-key="item.key"
        :style="{ gridColumn: item.span === 'full' ? '1 / -1' : `span var(--qk-descriptions-span-${item.span ?? 1})` }">
        <dt class="qk-descriptions__label"><slot name="label" :item="item" :index="index">{{ item.label }}</slot></dt>
        <dd class="qk-descriptions__value"><slot name="value" :item="item" :index="index">{{ item.value === '' || item.value == null ? emptyValue : item.value }}</slot></dd>
      </div>
    </dl>
  </div>
</template>
