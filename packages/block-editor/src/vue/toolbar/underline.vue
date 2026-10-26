<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref } from "vue";
import { isUnderlineStyle, type UnderlineAttributes } from "@quirekit/extension-underline";
import { EditorUIUnderlineGallery } from "@quirekit/editor-ui/vue";
import { QuireColorPicker, QuireSpace, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { BlockToolbarProps } from "../types";
import { applyBlockUnderline, blockUnderlineStyles } from "../../ui/toolbar/underline";
import { restoreBlockEditorFocus } from "../../ui/focus";

const { t, locale } = useBlockLocale();

const props = defineProps<{ /** Shared Toolbar popup and current editor projection. */ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as BlockToolbarProps);
const style = computed(() => context.value.format.underlineStyle);
const color = computed(() => context.value.format.underlineColor);
const recent = ref<string[]>([]);
let source = context.value.editor.state.pm;

/** @param attrs - Explicit field edit. @returns Whether it applied to the captured selection. */
function apply(attrs: UnderlineAttributes): boolean {
  const editor = context.value.editor;
  if (!applyBlockUnderline(editor, source, attrs)) return false;
  source = editor.state.pm;
  return true;
}
/** @param value - Canonical style chosen in the shared gallery. */
function select(value: string): void {
  if (isUnderlineStyle(value) && apply({ underlineType: value })) {
    props.scope.setExpanded(false);
    restoreBlockEditorFocus(context.value.editor);
  }
}
/** @param value - Explicit RGB, or null to follow the glyph color. */
function setColor(value: string | null): void {
  if (apply({ color: value }) && value) recent.value = [value, ...recent.value.filter(item => item !== value)].slice(0, 8);
}
</script>
<template>
  <QuireSpace orientation="vertical" gap="surfaceCompact" class="qk-block-underline-options">
    <EditorUIUnderlineGallery :locale="locale" :styles="blockUnderlineStyles" :model-value="style ? [style] : []" :disabled="scope.disabled" @select="select" />
    <div class="qk-block-underline-options__color">
      <span>{{ t("下划线颜色") }}</span>
      <span>{{ color === null ? t('混合') : color || t('自动') }}</span>
      <QuireColorPicker :label="t('下划线颜色')" :model-value="color || '#000000'" :reset-active="color === ''"
        :disabled="scope.disabled || style === 'none'" :reset-label="t('自动')" :show-alpha="false" :show-eyedropper="false"
        :recent-colors="recent" @commit="setColor" @reset="setColor(null)" />
    </div>
  </QuireSpace>
</template>
