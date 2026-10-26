<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref } from "vue";
import { QuireCodeBlockHeader, QuireSelect, QuireIcon, QuireMenu, QuireThemeProvider, QuireOverlayProvider, QuireToolbar, QuireToolbarToggle, QuireToolbarDisclosure } from "@quirekit/ui/vue";
import type { BlockCodeState, BlockCodeSurface } from "../../code/types";
import { blockCodeLanguages } from "../../code/languages";
import { codeDisplayOptions, codeDisplayPatch } from "../../code/options";
import { useBlockCodeTheme } from "./theme";

const { t, localize } = useBlockLocale();
const props = defineProps<{ surface: BlockCodeSurface; state: BlockCodeState }>();
const error = ref("");
const settingsOpen = ref(false);
const theme = useBlockCodeTheme(props.surface, () => props.state.theme);
const languages = computed(() => blockCodeLanguages(props.state.language).map(item => ({ ...item, label: item.label.replace("（纯文本显示）", t("（纯文本显示）")) })));
/** @param value - Explicit grammar selection. */
function select(value: string | undefined): void {
  if (value !== undefined) error.value = props.surface.setLanguage(value.slice(9)) ? "" : "代码块已变化，请重新选择";
}
/** @param value - Public settings action. */
function configure(value: string): void {
  const patch = codeDisplayPatch(value, props.state);
  if (patch) error.value = props.surface.setDisplay(patch) ? "" : "代码块已变化，请重新设置";
}
</script>
<template>
  <QuireThemeProvider :theme="theme" :surface="false">
  <QuireOverlayProvider strategy="fixed">
  <QuireCodeBlockHeader :get-code="surface.getCode">
    <template #title>
      <QuireSelect :label="t('代码语言')" :model-value="`language:${state.language}`" :items="localize(languages)" :disabled="state.readOnly" variant="text" size="xs" width="132px" content-width="180px" @value-change="select" />
      <span v-if="error" role="status" class="qk-type-helper">{{ t(error) }}</span>
    </template>
    <template #actions>
      <QuireToolbar :label="t('代码显示')" variant="plain" overflow="visible" preserve-focus>
      <QuireToolbarToggle :label="t('自动换行')" :tooltip="state.wrap ? t('自动换行（已开启）') : t('自动换行（已关闭）')"
        :disabled="state.readOnly" :disabled-reason="t('阅读模式下不能修改代码设置')" :model-value="state.wrap" @update:model-value="configure('wrap')"><QuireIcon name="wrapText" /></QuireToolbarToggle>
      <QuireMenu v-model:open="settingsOpen" :items="localize(codeDisplayOptions(state))" @select="configure">
        <template #trigger><QuireToolbarDisclosure :label="t('代码设置')" v-model:expanded="settingsOpen" :toggle-on-click="false"
          :disabled="state.readOnly" :disabled-reason="t('阅读模式下不能修改代码设置')"><QuireIcon name="slidersHorizontal" /></QuireToolbarDisclosure></template>
      </QuireMenu>
      </QuireToolbar>
    </template>
  </QuireCodeBlockHeader>
  </QuireOverlayProvider>
  </QuireThemeProvider>
</template>
