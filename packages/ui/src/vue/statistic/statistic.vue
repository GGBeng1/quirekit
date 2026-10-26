<script setup lang="ts">
import { computed } from 'vue';
import { QuireSkeleton } from '../skeleton';
import { useQuireKitLocale, useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitStatisticProps, QuireKitStatisticSlots } from './types';

const props = withDefaults(defineProps<QuireKitStatisticProps>(), {
  size: 'md', loading: false, emptyValue: '—',
});
const text = useQuireKitMessages('statistic');
const locale = useQuireKitLocale();
defineSlots<QuireKitStatisticSlots>();
const availableValue = computed(() => typeof props.value === 'bigint'
  || (typeof props.value === 'number' && Number.isFinite(props.value)) ? props.value : undefined);
const formatter = computed(() => new Intl.NumberFormat(locale.value, props.formatOptions));
const formattedParts = computed(() => availableValue.value === undefined ? [] : formatter.value.formatToParts(availableValue.value));
const formattedValue = computed(() => formattedParts.value.map(part => part.value).join(''));
</script>

<template>
  <dl :class="['qk-statistic', `qk-statistic--${size}`]" :aria-busy="loading || undefined" data-qk-not-prose>
    <dt class="qk-statistic__title"><slot name="title">{{ title }}</slot></dt>
    <dd class="qk-statistic__body">
      <div :class="['qk-statistic__content', `qk-statistic__content--${size}`]">
        <template v-if="loading">
          <QuireSkeleton width="5ch" height="1em" :animated="false" />
          <span class="sr-only">{{ text.loading }}</span>
        </template>
        <template v-else-if="availableValue === undefined">
          <span class="qk-statistic__empty" aria-hidden="true">{{ emptyValue }}</span>
          <span class="sr-only">{{ text.empty }}</span>
        </template>
        <template v-else>
          <span v-if="prefix || $slots.prefix" class="qk-statistic__prefix"><slot name="prefix">{{ prefix }}</slot></span>
          <span class="qk-statistic__value"><slot name="value" :value="availableValue" :formatted-value="formattedValue"><template v-for="(part, index) in formattedParts" :key="index">{{ part.value }}<wbr v-if="part.type === 'group'"></template></slot></span>
          <span v-if="suffix || $slots.suffix" class="qk-statistic__suffix"><slot name="suffix">{{ suffix }}</slot></span>
        </template>
      </div>
      <div v-if="description || $slots.description" class="qk-statistic__description"><slot name="description">{{ description }}</slot></div>
    </dd>
  </dl>
</template>
