import { resolveBuiltinClassicEditorMessage } from "@classic/localization";
import type { ClassicEditorLocale } from "@classic/types";
import type { ClassicFontTarget } from "@classic/shell/components/font-library/types";
import type { QuireKitMenuEntry } from "@quirekit/ui";

/**
 * Projects the font scope menu from only the active target and locale.
 * @param target - Current direct-formatting scope.
 * @param locale - Product language.
 * @returns Document settings action and independent script choices.
 */
export function createClassicFontTargetMenu(target: ClassicFontTarget, locale: ClassicEditorLocale): QuireKitMenuEntry[] {
  /** @param key - Built-in product label. @returns Label in the active locale. */
  const message = (key: Parameters<typeof resolveBuiltinClassicEditorMessage>[1]) => resolveBuiltinClassicEditorMessage(locale, key);
  return [
    { value: "document", label: message("documentFontShort") },
    { value: "document-separator", label: "", kind: "separator" },
    { value: "scripts", label: "", kind: "radio-group", selectedValue: target, children: [
      { value: "all", label: message("allScriptFontsShort") },
      { value: "eastAsia", label: message("eastAsianFontShort") },
      { value: "latin", label: message("latinFontShort") },
      { value: "complexScript", label: message("complexScriptFontShort") }
    ] }
  ];
}

/**
 * Labels the current picker and its accessible field.
 * @param target - Current script scope.
 * @param locale - Product language.
 * @returns Localized scope name.
 */
export function describeClassicFontTarget(target: ClassicFontTarget, locale: ClassicEditorLocale): string {
  const key = target === "eastAsia" ? "eastAsianFont" : target === "latin" ? "latinFont"
    : target === "complexScript" ? "complexScriptFont" : "allScriptFonts";
  return resolveBuiltinClassicEditorMessage(locale, key);
}

/**
 * Accepts only direct-formatting targets from the menu.
 * @param value - Public menu value, possibly the separate document action.
 * @returns Whether the value is a script scope.
 */
export function isClassicFontTarget(value: string | number): value is ClassicFontTarget {
  return value === "all" || value === "eastAsia" || value === "latin" || value === "complexScript";
}
