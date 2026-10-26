import {
  normalizeQuireDocumentFontTheme,
  quireDefaultDocumentFontTheme
} from "@quirekit/core";
import type { QuireKitComboboxItem } from "@quirekit/ui";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type {
  ClassicEditorGlobalSettingsPanelState
} from "../../../preset/builtin/global-settings";
import type { ClassicEditorImportedWebFontFamily } from "../../../types";
import {
  projectClassicFontOptionSources,
  resolveClassicDocumentFontFamilies,
  type ClassicFontTarget
} from "../../../shell/components/font-library/model";

/** Selectable family item rendered by one document script-font field. */
interface DocumentFontFamilyItem extends QuireKitComboboxItem {
  /** Exact logical CSS family written to the document font theme. */
  readonly family: string;
}

/**
 * Owns document-level Chinese and Western font settings for the global panel.
 *
 * @param state - Stable global-settings panel state.
 * @returns Reactive script values, options, and commit operations.
 */
export function useDocumentFontSettings(
  state: ClassicEditorGlobalSettingsPanelState
) {
  let disposed = false;
  const libraryRevision = ref(0);
  const busyTarget = ref<ClassicFontTarget | null>(null);
  const errorMessage = ref("");
  const context = computed(() => state.context);
  const library = computed(() => context.value.instance.fontLibrary);
  watch(library, (currentLibrary, _previousLibrary, onCleanup) => {
    libraryRevision.value += 1;
    const unsubscribe = currentLibrary?.subscribe(() => {
      libraryRevision.value += 1;
    });
    if (unsubscribe !== undefined) onCleanup(unsubscribe);
  }, { immediate: true });
  onBeforeUnmount(() => { disposed = true; });

  const theme = computed(() => normalizeQuireDocumentFontTheme(
    context.value.editor.state.doc.attrs.fontTheme
  ) ?? quireDefaultDocumentFontTheme);
  const importedFamilies = computed(() => {
    libraryRevision.value;
    return [...(library.value?.importedFamilies ?? [])];
  });
  const latinFamily = computed(() => theme.value.body.latin
    ?? quireDefaultDocumentFontTheme.body.latin
    ?? "Calibri");
  const eastAsiaFamily = computed(() => theme.value.body.eastAsia
    ?? quireDefaultDocumentFontTheme.body.eastAsia
    ?? "宋体");
  const latinItems = computed(() => createItems(
    "latin",
    latinFamily.value,
    importedFamilies.value,
    context.value.editor.state.doc.attrs.fontTheme
  ));
  const eastAsiaItems = computed(() => createItems(
    "eastAsia",
    eastAsiaFamily.value,
    importedFamilies.value,
    context.value.editor.state.doc.attrs.fontTheme
  ));

  /**
   * Installs one imported family when needed, then updates exactly one script slot.
   *
   * @param target - Latin or East Asian document theme slot.
   * @param value - Exact family emitted by the public Combobox.
   */
  async function commitFamily(
    target: Extract<ClassicFontTarget, "latin" | "eastAsia">,
    value: string | undefined
  ): Promise<void> {
    if (value === undefined || busyTarget.value !== null || disposed) return;
    const requestedContext = context.value;
    const requestedLibrary = library.value;
    const imported = importedFamilies.value.find(entry => entry.family === value);
    busyTarget.value = target;
    errorMessage.value = "";
    try {
      const phase = requestedLibrary?.getStatus(value).phase;
      if (
        imported !== undefined
        && requestedLibrary !== undefined
        && !["installed", "local", "registered"].includes(phase ?? "")
      ) await requestedLibrary.install(value);
      // Async font loading must not write into a replaced editor or library.
      if (
        disposed
        || context.value.editor !== requestedContext.editor
        || library.value !== requestedLibrary
        || !requestedContext.editor.isEditable
      ) return;
      if (target === "latin") {
        requestedContext.editor.commands.setDocumentLatinFontFamily(value);
      } else {
        requestedContext.editor.commands.setDocumentEastAsiaFontFamily(value);
      }
    } catch (error) {
      if (!disposed) {
        errorMessage.value = error instanceof Error ? error.message : String(error);
      }
    } finally {
      busyTarget.value = null;
    }
  }

  return {
    busyTarget,
    errorMessage,
    latinFamily,
    eastAsiaFamily,
    latinItems,
    eastAsiaItems,
    commitFamily
  };
}

/**
 * Projects current defaults and imported families into public Combobox items.
 *
 * @param target - Script slot represented by the field.
 * @param currentFamily - Current canonical document family.
 * @param importedFamilies - Current browser font-library imports.
 * @param fontTheme - Candidate canonical document font theme.
 * @returns Stable current-first selectable family list.
 */
function createItems(
  target: Extract<ClassicFontTarget, "latin" | "eastAsia">,
  currentFamily: string,
  importedFamilies: readonly ClassicEditorImportedWebFontFamily[],
  fontTheme: unknown
): readonly DocumentFontFamilyItem[] {
  const defaults = resolveClassicDocumentFontFamilies(fontTheme, target);
  return projectClassicFontOptionSources(
    currentFamily,
    defaults,
    importedFamilies
  ).map(source => ({
    value: source.family,
    label: source.imported?.displayName ?? source.family,
    family: source.family,
    keywords: [source.family, source.imported?.displayName ?? ""]
  }));
}
