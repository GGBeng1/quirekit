<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, watch } from "vue";
import { EditorUIFontField } from "@quirekit/editor-ui/vue";
import { resolveEditorFontSizeControlValue, resolveEditorFontSizeSelection } from "@quirekit/editor-ui";
import { QuireSelect, QuireToolbarField, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { blockFontChoices, blockSizeChoices, blockTypeChoices } from "../../ui/toolbar/options";
import type { BlockToolbarProps } from "../types";
import type { EditorState } from "@quirekit/pm";
import { useBlockFontScope, setBlockFont } from "./fonts/state";
import { restoreBlockEditorFocus } from "../../ui/focus";

const { t, localize, locale } = useBlockLocale();
const props = defineProps<{ /** Public shared toolbar scope. */ readonly scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as BlockToolbarProps);
const kind = computed(() => props.scope.item.value);
const fontScope = useBlockFontScope(context.value.editor);
const family = computed(() => fontScope.target.value === "all" ? context.value.format.font : context.value.format.fonts[fontScope.target.value]);
const options = computed(() => kind.value === "font" ? blockFontChoices : blockSizeChoices);
const value = computed(() => {
  if (kind.value === "font") return family.value === null ? null : family.value ? `font:${family.value}` : "font:default";
  const size = context.value.format.size;
  return size ? `size:${resolveEditorFontSizeControlValue(locale.value, Number.parseFloat(size))}` : null;
});
const placeholder = computed(() => kind.value === "font" ? family.value === null ? t("混合字体") : family.value || t("默认字体")
  : locale.value === "en" ? context.value.format.size === null ? "Mixed" : "Size" : context.value.format.size === null ? "混合字号" : "字号");
let source: EditorState | null = null;
watch(() => props.scope.expanded, open => { if (open) source = context.value.editor.state.pm; });
/** @param next - Public field selection; delayed commits retain their exact source range. */
function select(next: string | number | null | undefined): void {
  const editor = context.value.editor, state = editor.state.pm;
  if (props.scope.disabled || next == null || !source || source.doc !== state.doc || !source.selection.eq(state.selection)) return;
  if (kind.value === "font") setBlockFont(editor, fontScope.target.value, next === "font:default" ? "" : String(next).replace(/^font:/u, ""));
  else if (kind.value === "size") {
    const points = resolveEditorFontSizeSelection(String(next).replace(/^size:/u, ""));
    if (points === null) return;
    editor.commands.setFontSize(`${points}pt`);
  } else props.scope.execute(next);
  props.scope.setExpanded(false); restoreBlockEditorFocus(editor);
}
</script>
<template>
 <QuireToolbarField v-if="kind === 'block'" v-slot="{ size }" :label="t(scope.item.label)" :expanded="scope.expanded" :disabled="scope.disabled" width="126px">
  <QuireSelect :label="t(scope.item.label)" :size="size" width="126px" content-width="180px" :model-value="context.format.block" :items="localize(blockTypeChoices)"
   :placeholder="t('混合格式')" :disabled="scope.disabled" :open="scope.expanded" @update:open="scope.setExpanded($event === true)" @update:model-value="select" />
 </QuireToolbarField>
 <EditorUIFontField v-else :scope="scope" :kind="kind === 'font' ? 'family' : 'size'" :label="t(scope.item.label)" :value="value" :options="localize(options)" :placeholder="placeholder"
  :format-state="value === null ? 'mixed' : 'single'" allow-custom-value @select="select" />
</template>
