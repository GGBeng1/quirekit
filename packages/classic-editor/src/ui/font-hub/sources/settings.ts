import { computed, ref, watch, type ComputedRef } from "vue";
import type { ClassicEditorFontLibrary, ClassicEditorWebFontSource } from "@classic/types";
import type { ClassicFontHubMessageResolver } from "../types";

/**
 * Owns source-setting drafts independently of the browsing source.
 * @param library - Mounted source API.
 * @param sources - Current source registry.
 * @param message - Localized copy.
 * @param onSaved - Invalidates only the affected browsing catalog.
 * @returns Source selection, drafts, validation and save feedback.
 */
export function useFontSourceSettings(
  library: ComputedRef<ClassicEditorFontLibrary | undefined>,
  sources: ComputedRef<readonly ClassicEditorWebFontSource[]>,
  message: ClassicFontHubMessageResolver,
  onSaved: (sourceId: string) => void
) {
  const sourceId = ref("");
  const drafts = ref<Record<string, Record<string, string>>>({});
  const invalidKeys = ref<readonly string[]>([]);
  const feedback = ref("");
  const feedbackTone = ref<"error" | "success">("success");
  const source = computed(() => sources.value.find((entry) => entry.id === sourceId.value));
  const settings = computed(() => drafts.value[sourceId.value] ?? {});

  watch(
    sources,
    (entries) => {
      if (!entries.some((entry) => entry.id === sourceId.value))
        sourceId.value = "";
    },
    { immediate: true }
  );
  watch(
    sourceId,
    (id) => {
      if (id && drafts.value[id] === undefined) {
        drafts.value = { ...drafts.value, [id]: { ...library.value?.getSourceSettings(id) } };
      }
      feedback.value = "";
      invalidKeys.value = [];
    },
    { immediate: true }
  );

  /**
   * Opens a source settings task with a fresh persisted draft.
   * @param id - Source whose settings button was activated.
   */
  function open(id: string): void {
    drafts.value = {
      ...drafts.value,
      [id]: { ...library.value?.getSourceSettings(id) }
    };
    sourceId.value = id;
    feedback.value = "";
    invalidKeys.value = [];
  }

  /** Closes the active settings task and discards its unsaved draft. */
  function close(): void {
    const id = sourceId.value;
    if (id) {
      drafts.value = {
        ...drafts.value,
        [id]: { ...library.value?.getSourceSettings(id) }
      };
    }
    sourceId.value = "";
    feedback.value = "";
    invalidKeys.value = [];
  }

  /**
   * Edits a source-local draft without changing catalog state.
   * @param key - Setting field key.
   * @param value - User input.
   */
  function update(key: string, value: string): void {
    drafts.value = { ...drafts.value, [sourceId.value]: { ...settings.value, [key]: value } };
    invalidKeys.value = invalidKeys.value.filter((entry) => entry !== key);
    feedback.value = "";
  }

  /**
   * Validates and persists the selected source, preserving failed drafts.
   * @returns Whether settings were committed successfully.
   */
  function save(): boolean {
    if (!source.value || !library.value) return false;
    invalidKeys.value = source.value.settingFields
      .filter((field) => field.required && !settings.value[field.key]?.trim())
      .map((field) => field.key);
    if (invalidKeys.value.length) return false;
    try {
      library.value.configureSource(source.value.id, settings.value);
      feedbackTone.value = "success";
      feedback.value = message("sourceSettingsSaved");
      onSaved(source.value.id);
      return true;
    } catch (error) {
      feedbackTone.value = "error";
      feedback.value = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  return {
    sourceId,
    source,
    settings,
    invalidKeys,
    feedback,
    feedbackTone,
    open,
    close,
    update,
    save
  };
}
