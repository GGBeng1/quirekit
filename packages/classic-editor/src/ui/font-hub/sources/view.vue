<script setup lang="ts">
import {
  QuireButton,
  QuireCard,
  QuireDialogRoot,
  QuireDialogTrigger,
  QuireEmptyState,
  QuireTypography
} from "@quirekit/ui/vue";
import { ref, watch, type HTMLAttributes } from "vue";
import type {
  ClassicEditorFontLibrary,
  ClassicEditorLocale,
  ClassicEditorWebFontSource
} from "@classic/types";
import CustomSourceManager from "./custom-manager.vue";
import SourceSettingsDialogContent from "./settings-dialog-content.vue";
import FontHubFeedback from "../feedback.vue";
import type {
  ClassicFontHubController,
  ClassicFontHubMessageResolver,
  ClassicFontHubSourceLabelResolver,
  ClassicFontHubTextResolver
} from "../types";

/** Inputs for the source configuration and extension task. */
interface Props {
  /** Shared Font Hub business controller. */
  readonly hub: ClassicFontHubController;
  /** Mounted font-library authority. */
  readonly library?: ClassicEditorFontLibrary | undefined;
  /** Active product locale. */
  readonly locale: ClassicEditorLocale;
  /** Resolved Font Hub copy. */
  readonly message: ClassicFontHubMessageResolver;
  /** Configured source label resolver. */
  readonly sourceLabel: ClassicFontHubSourceLabelResolver;
  /** Source-contributed text resolver. */
  readonly text: ClassicFontHubTextResolver;
  /** Theme and overlay attributes forwarded to Select content. */
  readonly popupProps: HTMLAttributes;
  /** Optional owner-document portal target for nested source dialogs. */
  readonly dialogPortalTarget?: HTMLElement | undefined;
}

const props = defineProps<Props>();
const sourceList = ref<HTMLElement>();
const lastSettingsSourceId = ref("");

watch(
  () => props.hub.sourceSettings.sourceId.value,
  (sourceId) => {
    if (sourceId) lastSettingsSourceId.value = sourceId;
  },
  { immediate: true }
);
/**
 * Opens a catalog through the public controller, without coupling source settings.
 * @param id - User-selected source identity.
 */
function browseSource(id: string): void {
  props.hub.selectedSourceId.value = id;
  props.hub.selectView("catalog");
}

/** Opens the selected source's focused settings task. */
function openSourceSettings(source: ClassicEditorWebFontSource): void {
  props.hub.sourceSettings.open(source.id);
}

/** Closes the settings task and restores its persisted draft. */
function updateSourceSettingsOpen(open: boolean): void {
  if (!open) props.hub.sourceSettings.close();
}

/**
 * Resolves the matching list action for direct and programmatic settings entry.
 * @returns Current source settings trigger when it remains available.
 */
function resolveSettingsTrigger(): HTMLElement | null {
  const sourceId = lastSettingsSourceId.value;
  if (!sourceId) return null;
  return sourceList.value?.querySelector<HTMLElement>(
    `[data-font-source-settings="${CSS.escape(sourceId)}"]`
  ) ?? null;
}
</script>

<template>
  <section
    class="qk-font-hub__panel qk-font-hub__panel--scroll"
    :aria-label="message('fontSources')"
  >
    <CustomSourceManager
      :library="library"
      :locale="locale"
      :message="message"
      :sources="hub.sources.value"
      :popup-props="popupProps"
      :dialog-portal-target="dialogPortalTarget"
      :browse-source="browseSource"
    />
    <QuireDialogRoot
      :open="Boolean(hub.sourceSettings.source.value?.settingFields.length)"
      :final-focus-el="resolveSettingsTrigger"
      @update:open="updateSourceSettingsOpen"
    >
      <div ref="sourceList" class="qk-font-hub__source-list">
        <QuireCard
          v-for="source in hub.sources.value.filter((item) => item.kind !== 'custom')"
          :key="source.id"
          variant="outline"
          density="compact"
          :description="source.description ? text(source.description) : ''"
        >
          <template #title>
            <QuireTypography variant="control">{{ sourceLabel(source) }}</QuireTypography>
          </template>
          <template #trailing>
            <div class="qk-font-hub__row-actions">
              <QuireDialogTrigger v-if="source.settingFields.length" as-child>
                <QuireButton
                  size="sm"
                  variant="ghost"
                  :data-font-source-settings="source.id"
                  @click="openSourceSettings(source)"
                >
                  {{ message("sourceSettings") }}
                </QuireButton>
              </QuireDialogTrigger>
              <QuireButton size="sm" variant="outline" @click="browseSource(source.id)">
                {{ locale === "en" ? "Browse fonts" : "浏览字体" }}
              </QuireButton>
            </div>
          </template>
        </QuireCard>
      </div>
      <SourceSettingsDialogContent
        :hub="hub"
        :message="message"
        :source-label="sourceLabel"
        :text="text"
        :popup-props="popupProps"
        :portal-target="dialogPortalTarget"
        @update:open="updateSourceSettingsOpen"
      />
    </QuireDialogRoot>
    <QuireEmptyState
      illustrated
      scene="search"
      v-if="!hub.sources.value.length"
      size="sm"
      :description="message('noFontSources')"
    />
    <FontHubFeedback
      :message="hub.sourceSettings.feedback.value"
      :tone="hub.sourceSettings.feedbackTone.value"
    />
  </section>
</template>
