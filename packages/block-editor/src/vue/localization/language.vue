<script setup lang="ts">
import { QuireMenu, QuireIconButton, QuireIcon } from "@quirekit/ui/vue";
import type { BlockEditorInstance } from "../../runtime";
import { useBlockLocale } from "./use-locale";

const { t, locale } = useBlockLocale();
defineProps<{ /** Stable product instance; language changes retain its document. */ instance: BlockEditorInstance }>();
</script>
<template>
  <QuireMenu :items="[{ value: 'zh-CN', label: t('简体中文'), icon: locale === 'zh-CN' ? 'check' : 'languages' }, { value: 'en', label: 'English', icon: locale === 'en' ? 'check' : 'languages' }]"
    @select="value => instance.setLocale(value === 'en' ? 'en' : 'zh-CN')">
    <template #trigger><QuireIconButton :label="t('界面语言')" variant="ghost"><QuireIcon name="languages" /></QuireIconButton></template>
  </QuireMenu>
</template>
