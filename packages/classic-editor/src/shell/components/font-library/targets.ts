import { normalizeQuireDocumentFontTheme, quireDefaultDocumentFontTheme } from "@quirekit/core";
import { readClassicFontFamily, normalizeClassicFontFamily } from "./identity";
import type { ClassicFontTarget, ClassicFontPickerTarget, ClassicMarkedFontTarget } from "./types";

/**
 * Resolves one compact picker target from canonical textStyle attributes.
 *
 * @param attributes - Current textStyle attributes.
 * @param target - All-script, explicit script, or document target.
 * @returns Effective direct family and ownership state.
 */
export function resolveClassicMarkedFontTarget(
  attributes: Readonly<Record<string, unknown>>,
  target: ClassicFontTarget
): ClassicMarkedFontTarget {
  const generic = readClassicFontFamily(attributes.fontFamily);
  const explicitLatin = readClassicFontFamily(attributes.fontFamilyLatin);
  const explicitEastAsia = readClassicFontFamily(attributes.fontFamilyEastAsia);
  const explicitComplexScript = readClassicFontFamily(
    attributes.fontFamilyComplexScript
  );
  const latin = explicitLatin ?? generic;
  const eastAsia = explicitEastAsia ?? generic;
  const complexScript = explicitComplexScript ?? generic;

  if (target === "latin") {
    return { family: latin, hasDirect: latin !== null };
  }
  if (target === "eastAsia") {
    return { family: eastAsia, hasDirect: eastAsia !== null };
  }
  if (target === "complexScript") {
    return { family: complexScript, hasDirect: complexScript !== null };
  }
  const hasDirect = [
    generic,
    explicitLatin,
    explicitEastAsia,
    explicitComplexScript
  ].some((family) => family !== null);
  return {
    family: latin !== null && latin === eastAsia && latin === complexScript
      ? latin
      : null,
    hasDirect
  };
}

/**
 * Resolves one inherited family from the canonical document font theme.
 *
 * @param value - Candidate document font theme.
 * @param target - All-script, explicit script, or document target.
 * @returns Inherited family, or null.
 */
export function resolveClassicDocumentFontTarget(
  value: unknown,
  target: ClassicFontPickerTarget
): string | null {
  const families = resolveClassicDocumentFontFamilies(value, target);
  return families.length === 1 ? families[0] ?? null : null;
}

/**
 * Resolves distinct document body defaults for one compact-picker target.
 *
 * @param value - Candidate document font theme.
 * @param target - All-script, explicit script, or document target.
 * @returns Ordered distinct logical default families.
 */
export function resolveClassicDocumentFontFamilies(
  value: unknown,
  target: ClassicFontPickerTarget
): readonly string[] {
  const theme = normalizeQuireDocumentFontTheme(value)
    ?? quireDefaultDocumentFontTheme;
  const latin = readClassicFontFamily(theme.body.latin);
  const eastAsia = readClassicFontFamily(theme.body.eastAsia);
  const complexScript = readClassicFontFamily(theme.body.complexScript);
  const heading = theme.heading ?? theme.body;
  const candidates = target === "latin" ? [latin]
    : target === "eastAsia" ? [eastAsia]
      : target === "complexScript" ? [complexScript]
      : target === "document"
        ? [
            latin,
            eastAsia,
            complexScript,
            readClassicFontFamily(heading.latin),
            readClassicFontFamily(heading.eastAsia),
            readClassicFontFamily(heading.complexScript)
          ]
        : [latin, eastAsia];
  const seen = new Set<string>();
  return candidates.filter((family): family is string => {
    if (family === null) return false;
    const identity = normalizeClassicFontFamily(family);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
