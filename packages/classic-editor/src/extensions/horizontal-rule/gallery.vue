<script setup lang="ts">
import { computed } from "vue";
import { QuireListbox, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { QuireKitListboxItem } from "@quirekit/ui";
import type { ClassicEditorToolbarContributionState } from "@classic/types";
import { horizontalRulePresets, type HorizontalRulePreset } from "@quirekit/extension-horizontal-rule";
import { resolveBuiltinClassicEditorMessage, type BuiltinClassicEditorMessageKey } from "@classic/localization";
const props = defineProps<{ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => (props.scope.context as ClassicEditorToolbarContributionState).context);
const galleryLabel = computed(() => resolveBuiltinClassicEditorMessage(
  context.value.locale,
  "horizontalRulePresets"
));
const presetMessageKeys: Readonly<Record<string, BuiltinClassicEditorMessageKey>> = {
  thin: "horizontalRuleThin",
  standard: "horizontalRuleStandard",
  thick: "horizontalRuleThick",
  double: "horizontalRuleDouble",
  dotted: "horizontalRuleDotted",
  dashed: "horizontalRuleDashed",
  shaded: "horizontalRuleShaded"
};
const galleryItems = computed<readonly QuireKitListboxItem[]>(() => (
  horizontalRulePresets.map((preset) => ({
    value: preset.id,
    label: resolvePresetLabel(preset)
  }))
));

/**
 * Resolves localized copy for one stable built-in preset.
 *
 * @param preset - Shared horizontal-rule preset.
 * @returns Active-locale visible label.
 */
function resolvePresetLabel(preset: HorizontalRulePreset): string {
  const key = presetMessageKeys[preset.id];
  return key === undefined
    ? preset.label
    : resolveBuiltinClassicEditorMessage(context.value.locale, key);
}

/**
 * Inserts one atomic rule style through the public Classic behavior contract.
 *
 * @param preset - Shared preset chosen from the gallery.
 * @returns Completion after the editor action executes.
 */
async function insertPreset(preset: HorizontalRulePreset): Promise<void> {
  context.value.editor.commands.setHorizontalRule(preset.style);
  context.value.instance.refreshProductUi();
  props.scope.setExpanded(false);
}

/**
 * Resolves a shared-gallery key back to the atomic horizontal-rule preset.
 *
 * @param key - Stable preset identity emitted by the shared gallery.
 * @returns Completion after the matching preset is inserted, when present.
 */
async function insertPresetByKey(key: string): Promise<void> {
  const preset = horizontalRulePresets.find((candidate) => candidate.id === key);
  if (preset !== undefined) await insertPreset(preset);
}
</script>
<template>
  <QuireListbox
    :label="galleryLabel"
    hide-label
    :items="galleryItems"
    :disabled="!context.editor.isEditable"
    class="qk-classic-editor__horizontal-rule-gallery"
    @select="insertPresetByKey"
  >
    <template #item="{ item }">
      <span class="qk-classic-editor__horizontal-rule-label">{{ item.label }}</span>
      <span
        class="qk-classic-editor__horizontal-rule-preview"
        :data-variant="horizontalRulePresets.find(preset => preset.id === item.value)?.style.variant"
        :style="{
          '--qk-horizontal-rule-thickness': `${Math.max(
            1,
            (horizontalRulePresets.find(preset => preset.id === item.value)?.style.thicknessPt ?? 1) * 96 / 72
          )}px`
        }"
        aria-hidden="true"
      />
    </template>
  </QuireListbox>
</template>
