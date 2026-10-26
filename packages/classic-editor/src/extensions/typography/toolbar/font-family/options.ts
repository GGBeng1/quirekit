import type { ClassicEditorDocumentFontStatus, ClassicEditorLocale } from "@classic/types";
import { resolveBuiltinClassicEditorMessage } from "@classic/localization";
import { resolveClassicFontAvailabilityDiagnostic } from "@classic/shell/components/font-library/model";

/** Non-imported family identity is independent of the local Font Hub catalog. */
export const logicalClassicFontOptionPrefix = "logical:";

/**
 * Localizes one authoritative document-font diagnostic for an option row.
 *
 * @param family - Logical family represented by the option.
 * @param status - Authoritative document font diagnostics.
 * @param locale - Current product language.
 * @returns Localized diagnostic, or an empty string when no warning applies.
 */
export function resolveFontOptionAvailabilityMessage(
  family: string,
  status: ClassicEditorDocumentFontStatus | undefined,
  locale: ClassicEditorLocale
): string {
  const diagnostic = resolveClassicFontAvailabilityDiagnostic(family, status);
  if (
    diagnostic === "substituted"
    && status?.requestedFamily !== null
    && status?.requestedFamily !== undefined
    && status.renderedFamily !== null
  ) {
    return resolveBuiltinClassicEditorMessage(locale, "fontSubstituted", {
      requested: status.requestedFamily,
      rendered: status.renderedFamily
    });
  }
  return diagnostic === "unresolved" && status?.requestedFamily != null
    ? resolveBuiltinClassicEditorMessage(locale, "fontUnresolved", { requested: status.requestedFamily })
    : "";
}

/**
 * Creates a synthetic option identity for a logical family absent from the Hub.
 *
 * @param family - Logical requested document family.
 * @returns Stable selector identity used for current/default presentation.
 */
export function createLogicalClassicFontOptionKey(family: string): string {
  return `${logicalClassicFontOptionPrefix}${family}`;
}
