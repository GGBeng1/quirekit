<script setup lang="ts">
import { computed, inject } from 'vue';
import { DEFAULT_LOCALE, LocaleProvider, useLocaleContext } from '@ark-ui/vue/locale';
import LocaleDirection from './locale-direction.vue';
import { quireKitLocaleKey } from '../../locale-provider/context';
// A QuireLocaleProvider decides language and direction; without one, an outer headless provider still applies.
const quireLocale = inject(quireKitLocaleKey, null);
const inherited = useLocaleContext(DEFAULT_LOCALE);
const locale = computed(() => quireLocale?.value.code ?? inherited.value.locale);
defineSlots<{ /** Provides the resolved direction without adding a DOM wrapper. */ default: (context: { dir: 'ltr' | 'rtl' }) => unknown }>();
</script>

<template>
  <LocaleProvider :locale="locale">
    <LocaleDirection v-slot="context"><slot v-bind="context" /></LocaleDirection>
  </LocaleProvider>
</template>
