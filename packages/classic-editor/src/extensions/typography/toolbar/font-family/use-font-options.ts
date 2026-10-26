import { computed, type Ref } from "vue";
import type { ClassicEditorDocumentFontStatus, ClassicEditorImportedWebFontFamily, ClassicEditorMountedFontFamily, ClassicEditorRenderContext } from "@classic/types";
import { resolveBuiltinClassicEditorMessage } from "@classic/localization";
import {
  createClassicFontOptionKey,
  projectClassicFontOptionSources,
  resolveClassicDocumentFontFamilies,
  type ClassicFontTarget
} from "@classic/shell/components/font-library/model";
import { createLogicalClassicFontOptionKey, resolveFontOptionAvailabilityMessage } from "./options";

/**
 * Projects picker choices from font facts instead of the complete refresh context.
 * @param context - Latest product context, including authoritative font diagnostics.
 * @param target - Current script target.
 * @param currentFamily - Effective logical selection family.
 * @param importedFamilies - Library snapshot invalidated by resource notifications.
 * @param mountedFamilies - Application-mounted font families.
 * @param recentFamilies - Newest-first browser-local font choices.
 * @param busyFamily - Current explicitly requested font installation.
 * @returns Stable locale, current option identity and font picker inventory.
 */
export function useClassicFontOptions(
  context: Readonly<Ref<ClassicEditorRenderContext>>,
  target: Readonly<Ref<ClassicFontTarget>>,
  currentFamily: Readonly<Ref<string | null>>,
  importedFamilies: Readonly<Ref<readonly ClassicEditorImportedWebFontFamily[]>>,
  mountedFamilies: Readonly<Ref<readonly ClassicEditorMountedFontFamily[]>>,
  recentFamilies: Readonly<Ref<readonly string[]>>,
  busyFamily: Readonly<Ref<string>>
) {
  const locale = computed(() => context.value.locale);
  const fontTheme = computed(() => context.value.editor.state.doc.attrs.fontTheme);
  const defaults = computed(() => resolveClassicDocumentFontFamilies(fontTheme.value, target.value));
  const sources = computed(() => projectClassicFontOptionSources(
    currentFamily.value,
    defaults.value,
    importedFamilies.value,
    mountedFamilies.value
  ));
  // The runtime can publish a fresh diagnostic record with unchanged facts.
  // Scalar boundaries still notice genuine changes, including mutable providers.
  const requestedFamily = computed(() => context.value.instance.documentFontStatus?.requestedFamily ?? null);
  const renderedFamily = computed(() => context.value.instance.documentFontStatus?.renderedFamily ?? null);
  const status = computed(() => context.value.instance.documentFontStatus?.status ?? "pending");
  const source = computed(() => context.value.instance.documentFontStatus?.source ?? null);
  const diagnostic = computed<ClassicEditorDocumentFontStatus>(() => ({
    requestedFamily: requestedFamily.value, renderedFamily: renderedFamily.value,
    status: status.value, source: source.value
  }));
  const currentFamilyOptionKey = computed(() => {
    const current = sources.value.find(item => item.current);
    if (current === undefined) return null;
    return current.imported === undefined
      ? createLogicalClassicFontOptionKey(current.family)
      : createClassicFontOptionKey(current.imported);
  });
  const fontPickerOptions = computed(() => {
    const recentIdentities = new Map(recentFamilies.value.map((family, index) => [
      normalizeFamily(family), index
    ]));
    const recent = sources.value
      .filter((item) => recentIdentities.has(normalizeFamily(item.family)))
      .sort((left, right) => (
        (recentIdentities.get(normalizeFamily(left.family)) ?? 0)
        - (recentIdentities.get(normalizeFamily(right.family)) ?? 0)
      ));
    const recentSet = new Set(recent.map((item) => normalizeFamily(item.family)));
    const recommended = sources.value.filter((item) => !recentSet.has(normalizeFamily(item.family)));
    return [
      ...recent.map((item) => projectOption(item, resolveBuiltinClassicEditorMessage(locale.value, "recentFonts"))),
      ...recommended.map((item) => projectOption(item, resolveBuiltinClassicEditorMessage(locale.value, "recommendedFonts")))
    ];
  });

  /**
   * Projects one resource-aware source into a grouped Combobox row.
   *
   * @param item - Stable logical font source.
   * @param group - Localized visible group name.
   * @returns One searchable picker item.
   */
  function projectOption(item: (typeof sources.value)[number], group: string) {
    const displayName = item.mounted?.displayName ?? item.imported?.displayName;
    return {
      value: item.imported === undefined
        ? createLogicalClassicFontOptionKey(item.family)
        : createClassicFontOptionKey(item.imported),
      label: displayName ?? item.family,
      family: item.family,
      keywords: [item.family, displayName ?? ""],
      displayName,
      current: item.current,
      group,
      availabilityMessage: resolveFontOptionAvailabilityMessage(item.family, diagnostic.value, locale.value),
      disabled: busyFamily.value !== "",
      class: "qk-classic-editor__font-option"
    };
  }
  return { locale, currentFamilyOptionKey, fontPickerOptions };
}

/**
 * Normalizes one family for recent-list membership.
 *
 * @param family - Candidate CSS family.
 * @returns Stable case-insensitive identity.
 */
function normalizeFamily(family: string): string {
  return family.trim().toLocaleLowerCase("en-US");
}
