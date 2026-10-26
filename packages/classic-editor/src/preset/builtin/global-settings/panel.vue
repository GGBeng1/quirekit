<script setup lang="ts">
import { QuireInspectorSection } from "@quirekit/ui/vue";
import { nextTick, ref, watch } from "vue";
import { resolveClassicEditorText } from "../../../localization";
import type { ClassicEditorGlobalSettingsPanelState } from "./types";

const props = defineProps<{ state: ClassicEditorGlobalSettingsPanelState }>();
const root = ref<HTMLElement | null>(null);

/**
 * Resolves one contribution-owned label in the active product locale.
 *
 * @param value - Localizable contribution text.
 * @returns Visible localized text.
 */
function text(value: Parameters<typeof resolveClassicEditorText>[0]): string {
  return resolveClassicEditorText(value, props.state.context.locale);
}

/**
 * Scrolls a repeated navigation request to its exact registered section.
 *
 * @returns Completion after Vue has committed the current section directory.
 */
async function revealRequestedSection(): Promise<void> {
  const targetId = props.state.context.ui.state.rightSidebar.targetId;
  if (targetId === null) return;
  await nextTick();
  const target = [...(root.value?.querySelectorAll<HTMLElement>(
    "[data-global-settings-section]"
  ) ?? [])].find(element => element.dataset.globalSettingsSection === targetId);
  target?.scrollIntoView?.({ block: "start" });
}

watch(
  () => props.state.context.ui.state.rightSidebar.navigationRevision,
  () => { void revealRequestedSection(); },
  { immediate: true }
);
</script>

<template>
  <div ref="root" class="qk-classic-editor__global-settings">
    <div
      v-for="section in state.sections"
      :key="section.id"
      :data-global-settings-section="section.id"
    >
      <QuireInspectorSection
        :id="`qk-global-settings-${section.id}`"
        :title="text(section.label)"
        v-bind="section.description === undefined
          ? {}
          : { description: text(section.description) }"
      >
        <component
          :is="section.component"
          :state="state"
          v-bind="section.props ?? {}"
        />
      </QuireInspectorSection>
    </div>
  </div>
</template>
