<script setup lang="ts">
import { DEFAULT_LOCALE, useLocaleContext } from '@ark-ui/vue/locale';
const locale = useLocaleContext(DEFAULT_LOCALE);
defineSlots<{ /** Resolved from the nearest headless locale provider. */ default: (context: { dir: 'ltr' | 'rtl' }) => unknown }>();
</script>

<template><slot :dir="locale.dir" /></template>
