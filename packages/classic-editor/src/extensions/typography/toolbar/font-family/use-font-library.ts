import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  resolveBuiltinClassicEditorMessage,
  type BuiltinClassicEditorMessageKey,
  type BuiltinClassicEditorMessageParameters
} from "@classic/localization";
import type { ClassicEditorToolbarContributionState } from "@classic/types";
import {
  resolveClassicEffectiveFontFamily
} from "@classic/extensions/typography/effective-format";
import { builtinClassicEditorPanelIds } from "@classic/preset/builtin/ids";
import { globalFontSettingsSectionId } from "@classic/extensions/typography/global-settings";
import { logicalClassicFontOptionPrefix } from "./options";
import {
  createClassicFontOptionKey,
  type ClassicFontTarget
} from "@classic/shell/components/font-library/model";
import { useClassicFontOptions } from "./use-font-options";
import { createClassicFontTargetMenu, describeClassicFontTarget, isClassicFontTarget } from "./targets";

/**
 * Retains font loading and script-target state across reactive toolbar updates.
 * @param state - Current Classic host context.
 * @returns Font field, target menu, and Hub state and operations.
 */
export function useClassicFontLibrary(state: ClassicEditorToolbarContributionState) {
  let disposed = false;
  onBeforeUnmount(() => { disposed = true; });
  const pickerOpen = ref(false);
  const fontTarget = ref<ClassicFontTarget>("all");
  const hubOpen = ref(false);
  const busyFamily = ref("");
  const errorMessage = ref("");
  const libraryRevision = ref(0);
  const context = computed(() => state.context);
  const library = computed(() => context.value.instance.fontLibrary);
  watch(library, (currentLibrary, _previousLibrary, onCleanup) => {
    libraryRevision.value += 1;
    const unsubscribe = currentLibrary?.subscribe(() => {
      libraryRevision.value += 1;
    });
    if (unsubscribe !== undefined) onCleanup(unsubscribe);
  }, { immediate: true });
  const documentStatus = computed(() => context.value.instance.documentFontStatus);
  const effectiveFamily = computed(() => resolveClassicEffectiveFontFamily(
    context.value.editor,
    fontTarget.value,
    context.value.locale
  ));
  const currentFamily = computed(() => (
    effectiveFamily.value.kind === "single" ? effectiveFamily.value.value : null
  ));
  const currentFamilyLabel = computed(() => currentFamily.value ?? message("mixed"));
  const importedFamilies = computed(() => {
    libraryRevision.value;
    // A provider can mutate its catalog in place before publishing a revision.
    return [...(library.value?.importedFamilies ?? [])];
  });
  const mountedFamilies = computed(() => {
    libraryRevision.value;
    return [...(library.value?.mountedFamilies ?? [])];
  });
  const recentFamilies = computed(() => {
    libraryRevision.value;
    return [...(library.value?.recentFamilies ?? [])];
  });
  const { locale, currentFamilyOptionKey, fontPickerOptions } = useClassicFontOptions(
    context,
    fontTarget,
    currentFamily,
    importedFamilies,
    mountedFamilies,
    recentFamilies,
    busyFamily
  );
  const familyByOptionKey = computed(() => new Map(importedFamilies.value.map(
    (family) => [createClassicFontOptionKey(family), family]
  )));
  const targetOptions = computed(() => createClassicFontTargetMenu(fontTarget.value, locale.value));
  const targetLabel = computed(() => describeClassicFontTarget(fontTarget.value, locale.value));
  const currentLoaderStatus = computed(() => {
    libraryRevision.value;
    const family = currentFamily.value;
    return family === null ? undefined : library.value?.getStatus(family);
  });

  /**
   * Installs an imported font when needed and applies the selected script target.
   *
   * @param family - Exact imported family name.
   */
  async function applyFamily(family: string): Promise<void> {
    const currentLibrary = library.value;
    const requestedEditor = context.value.editor;
    const requestedTarget = fontTarget.value;
    if (busyFamily.value !== "" || disposed) return;
    busyFamily.value = family;
    errorMessage.value = "";
    try {
      const phase = currentLibrary?.getStatus(family).phase;
      if (currentLibrary !== undefined && !["installed", "local", "registered"].includes(phase ?? "")) {
        await currentLibrary.install(family);
      }
      // A delayed font download cannot act on a replaced editor, library, or script target.
      if (
        !disposed
        && context.value.editor === requestedEditor
        && library.value === currentLibrary
        && fontTarget.value === requestedTarget
      ) applyLogicalFamily(family);
    } catch (error) {
      if (!disposed) errorMessage.value = error instanceof Error ? error.message : String(error);
    } finally {
      busyFamily.value = "";
    }
  }

  /**
   * Routes a native select value to one imported font family.
   *
   * @param key - Stable option value emitted by the public component.
   */
  async function selectFontOption(key: string | number | null | undefined): Promise<void> {
    if (key == null) return;
    const optionKey = String(key);
    if (optionKey.startsWith(logicalClassicFontOptionPrefix)) {
      applyLogicalFamily(optionKey.slice(logicalClassicFontOptionPrefix.length));
      return;
    }
    const family = familyByOptionKey.value.get(optionKey);
    if (family !== undefined) await applyFamily(family.family);
  }

  /**
   * Applies one logical family to the active compact-picker script target.
   *
   * @param family - Exact logical family retained by the document.
   */
  function applyLogicalFamily(family: string): void {
    const editor = context.value.editor;
    // Permission can change during installation or after a callback was retained.
    if (disposed || !editor.isEditable || state.isTargetCurrent?.() === false) return;
    let applied: boolean;
    if (fontTarget.value === "latin") {
      applied = editor.commands.setLatinFontFamily(family);
    } else if (fontTarget.value === "eastAsia") {
      applied = editor.commands.setEastAsiaFontFamily(family);
    } else if (fontTarget.value === "complexScript") {
      applied = editor.commands.setComplexScriptFontFamily(family);
    } else {
      applied = editor.commands.setFontFamily(family);
    }
    if (applied) library.value?.rememberRecentFamily(family);
    pickerOpen.value = false;
  }

  /**
   * Switches the compact selector between document and selection font targets.
   *
   * @param key - Native dropdown key emitted by the public component.
   */
  function selectFontTarget(key: string | number): void {
    if (key === "document") {
      pickerOpen.value = false;
      context.value.ui.openSidebarPanel(
        "right",
        builtinClassicEditorPanelIds.globalSettings,
        { targetId: globalFontSettingsSectionId }
      );
      return;
    }
    if (!isClassicFontTarget(key)) return;
    fontTarget.value = key;
  }

  /**
   * Opens the full font Hub from a focusable dialog return target.
   * @param event - The Toolbar activation, after its pointer focus preservation.
   */
  function openHub(event?: Event): void {
    (event?.currentTarget as HTMLElement | null)?.focus();
    pickerOpen.value = false;
    hubOpen.value = true;
  }

  /**
   * Resolves built-in product copy from the widget's current locale.
   *
   * @param key - Stable Classic message key.
   * @param parameters - Optional named replacements.
   * @returns Localized product copy.
   */
  function message(
    key: BuiltinClassicEditorMessageKey,
    parameters?: BuiltinClassicEditorMessageParameters
  ): string {
    return resolveBuiltinClassicEditorMessage(locale.value, key, parameters);
  }

  return { pickerOpen, fontTarget, hubOpen, busyFamily, errorMessage, context, library, documentStatus, effectiveFamily, currentFamilyLabel, currentFamilyOptionKey, fontPickerOptions, targetOptions, targetLabel, currentLoaderStatus, selectFontOption, selectFontTarget, openHub, message };
}
