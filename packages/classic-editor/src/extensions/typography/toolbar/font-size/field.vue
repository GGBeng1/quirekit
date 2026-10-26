<script setup lang="ts">
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { EditorUIFontField } from "@quirekit/editor-ui/vue";
import { computed } from "vue";
import {
  resolveBuiltinClassicEditorMessage
} from "@classic/localization";
import type { ClassicEditorToolbarContributionState } from "@classic/types";
import {
  resolveClassicEffectiveFontSize
} from "@classic/extensions/typography/effective-format";
import {
  createClassicFontSizeOptions,
  resolveClassicFontSizeControlValue,
  resolveClassicFontSizeSelection
} from "@classic/extensions/typography/size-presets";


/** Inputs for the extension-owned direct font-size control. */
interface ClassicEditorFontSizeProps {
  /** Reactive context state owned by the ribbon widget controller. */
  readonly scope: QuireKitToolbarRendererScope;
}

const props = defineProps<ClassicEditorFontSizeProps>();
const context = computed(() => (props.scope.context as ClassicEditorToolbarContributionState).context);
const locale = computed(() => context.value.locale);
const effectiveSize = computed(() => (
  resolveClassicEffectiveFontSize(context.value.editor)
));
const currentSize = computed<number | null>(() => (
  effectiveSize.value.kind === "single" ? effectiveSize.value.value : null
));
const options = computed(() => (
  createClassicFontSizeOptions(locale.value).map((option) => ({
    label: option.label,
    value: String(option.value),
    points: option.points
  }))
));
const controlValue = computed(() => {
  const value = resolveClassicFontSizeControlValue(locale.value, currentSize.value);
  return value === null ? null : String(value);
});
const menuProps = computed(() => ({
  lang: locale.value,
  class: "qk-classic-editor__font-size-menu",
  ...props.scope.item.overlayProps?.contentAttributes
}));

/**
 * Applies one product option through the extension-owned point-size action.
 *
 * @param value - Preset identity or editable value emitted by the select.
 */
function setSize(value: string | number | null | undefined): void {
  const state = props.scope.context as ClassicEditorToolbarContributionState;
  if (!state.context.editor.isEditable || state.isTargetCurrent?.() === false) return;
  if (value === undefined) return;
  const points = resolveClassicFontSizeSelection(value);
  if (points === null) return;
  context.value.editor.commands.setFontSize(`${points}pt`);
  context.value.instance.refreshProductUi();
  props.scope.setExpanded(false);
}

/**
 * Resolves one built-in message in the mounted product locale.
 *
 * @param key - Font-size message key.
 * @returns Localized product copy.
 */
function message(
  key: "fontSize" | "increaseFontSize" | "decreaseFontSize" | "mixed"
): string {
  return resolveBuiltinClassicEditorMessage(locale.value, key);
}
</script>

<template>
 <EditorUIFontField :scope="scope" kind="size" control-class="qk-classic-editor__font-size-select" :label="message('fontSize')" :value="controlValue"
  :placeholder="effectiveSize.kind === 'mixed' ? message('mixed') : message('fontSize')" :options="options" :format-state="effectiveSize.kind" :content-props="menuProps" allow-custom-value @select="setSize" />
</template>
