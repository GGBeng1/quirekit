import { copyTextScale } from "../text-scale/value";
import {
  copyHexColor,
  copyNamedPointSize,
  copyPointSize,
  copyString,
  readNonEmptyString,
  readRecord
} from "./attributes";
import {
  invalidateEditedThemeAttributes,
  preserveTextStyleAttributes,
  readTextStylePreservation
} from "./preservation";
import { normalizeLetterSpacing } from "../letter-spacing";
import { normalizeRunLanguage } from "../language";
import { isTextStyleEmphasisMark } from "../style-attributes";

/**
 * Converts one LitAST text-style attribute bag into canonical schema attrs.
 *
 * This helper is also used for text-style values nested inside revision
 * snapshots, where the normal mark codec traversal cannot run recursively.
 *
 * @param source - Complete LitAST text-style attributes.
 * @param path - Diagnostic path for strict value validation.
 * @returns Canonical editable fields plus one producer preservation envelope.
 */
export function importLitAstTextStyleSnapshot(
  source: Readonly<Record<string, unknown>>,
  path: string
): Readonly<Record<string, unknown>> {
  const builtIn: Record<string, unknown> = {};
  copyString(source, "fontFamily", builtIn, "fontFamilyLatin");
  copyString(source, "fontFamilyEastAsia", builtIn, "fontFamilyEastAsia");
  copyString(
    source,
    "fontFamilyComplexScript",
    builtIn,
    "fontFamilyComplexScript"
  );
  copyPointSize(source, builtIn, path);
  copyNamedPointSize(source, "fontSizeComplexScript", builtIn, path);
  copyHexColor(source, "color", builtIn, path);
  copyHexColor(source, "backgroundColor", builtIn, path);
  copyLetterSpacing(source, builtIn, path);
  copyTextScale(source, builtIn, path);
  copyDirectEmphasisOverride(source, "bold", builtIn, path);
  copyDirectEmphasisOverride(source, "italic", builtIn, path);
  copyBoolean(source, "allCaps", builtIn, "allCaps", path);
  copyBoolean(source, "smallCaps", builtIn, "smallCaps", path);
  copyBoolean(source, "boldCs", builtIn, "boldCs", path);
  copyBoolean(source, "italicCs", builtIn, "italicCs", path);
  copyBoolean(source, "rtl", builtIn, "rightToLeft", path);
  copyBoolean(source, "snapToGrid", builtIn, "characterGrid", path);
  copyBoolean(source, "vanish", builtIn, "hidden", path);
  copyBoolean(source, "outline", builtIn, "outline", path);
  copyBoolean(source, "shadow", builtIn, "shadow", path);
  copyBoolean(source, "emboss", builtIn, "emboss", path);
  copyBoolean(source, "imprint", builtIn, "imprint", path);
  copyEmphasisMark(source, builtIn, path);
  copyLanguageSlotsFromLitAst(source, builtIn, path);
  preserveTextStyleAttributes(source, builtIn);
  return builtIn;
}

/**
 * Converts canonical schema attrs back into a LitAST text-style attribute bag.
 *
 * @param source - Canonical text-style attrs, including optional preservation.
 * @param path - Diagnostic path for strict value validation.
 * @returns Complete LitAST attributes for normal or nested DOCX generation.
 */
export function exportLitAstTextStyleSnapshot(
  source: Readonly<Record<string, unknown>>,
  path: string
): Readonly<Record<string, unknown>> {
  const preservation = readTextStylePreservation(
    source.litAstTextStylePreservation
  );
  const builtIn: Record<string, unknown> = {
    ...(preservation?.attributes ?? {})
  };
  copyTextScale(builtIn, builtIn, path);
  invalidateEditedThemeAttributes(source, preservation, builtIn);
  const generic = readNonEmptyString(source.fontFamily);
  const latin = readNonEmptyString(source.fontFamilyLatin) ?? generic;
  const eastAsia = readNonEmptyString(source.fontFamilyEastAsia) ?? generic;
  const complexScript =
    readNonEmptyString(source.fontFamilyComplexScript) ?? generic;
  if (latin !== undefined) builtIn.fontFamily = latin;
  if (eastAsia !== undefined) builtIn.fontFamilyEastAsia = eastAsia;
  if (complexScript !== undefined) {
    builtIn.fontFamilyComplexScript = complexScript;
  }
  copyPointSize(source, builtIn, path);
  copyNamedPointSize(source, "fontSizeComplexScript", builtIn, path);
  copyHexColor(source, "color", builtIn, path);
  copyHexColor(source, "backgroundColor", builtIn, path);
  copyLetterSpacing(source, builtIn, path);
  copyTextScale(source, builtIn, path);
  copyDirectEmphasisOverride(source, "bold", builtIn, path);
  copyDirectEmphasisOverride(source, "italic", builtIn, path);
  copyBoolean(source, "allCaps", builtIn, "allCaps", path);
  copyBoolean(source, "smallCaps", builtIn, "smallCaps", path);
  copyBoolean(source, "boldCs", builtIn, "boldCs", path);
  copyBoolean(source, "italicCs", builtIn, "italicCs", path);
  copyBoolean(source, "rightToLeft", builtIn, "rtl", path);
  copyBoolean(source, "characterGrid", builtIn, "snapToGrid", path);
  copyBoolean(source, "hidden", builtIn, "vanish", path);
  copyBoolean(source, "outline", builtIn, "outline", path);
  copyBoolean(source, "shadow", builtIn, "shadow", path);
  copyBoolean(source, "emboss", builtIn, "emboss", path);
  copyBoolean(source, "imprint", builtIn, "imprint", path);
  copyEmphasisMark(source, builtIn, path);
  copyLanguageSlotsToLitAst(source, builtIn, path);
  return builtIn;
}

/**
 * Imports the three independent `w:lang` slots into canonical textStyle fields.
 *
 * @param source - LitAST text-style attributes.
 * @param target - Mutable canonical attribute bag.
 * @param path - Diagnostic path used for strict validation.
 */
function copyLanguageSlotsFromLitAst(
  source: Readonly<Record<string, unknown>>,
  target: Record<string, unknown>,
  path: string
): void {
  const language = readRecord(source.lang);
  if (source.lang === undefined || source.lang === null) return;
  if (language === undefined) {
    throw new TypeError(`Unsupported textStyle.lang at ${path}.`);
  }
  copyLanguageValue(language, "val", target, "languageLatin", path);
  copyLanguageValue(language, "eastAsia", target, "languageEastAsia", path);
  copyLanguageValue(
    language,
    "bidi",
    target,
    "languageComplexScript",
    path
  );
}

/**
 * Exports canonical language slots as one exact LitAST `lang` tuple.
 *
 * @param source - Canonical textStyle attributes.
 * @param target - Mutable LitAST attribute bag.
 * @param path - Diagnostic path used for strict validation.
 */
function copyLanguageSlotsToLitAst(
  source: Readonly<Record<string, unknown>>,
  target: Record<string, unknown>,
  path: string
): void {
  const language: Record<string, string> = {};
  copyCanonicalLanguageValue(source, "languageLatin", language, "val", path);
  copyCanonicalLanguageValue(
    source,
    "languageEastAsia",
    language,
    "eastAsia",
    path
  );
  copyCanonicalLanguageValue(
    source,
    "languageComplexScript",
    language,
    "bidi",
    path
  );
  if (Object.keys(language).length > 0) target.lang = language;
}

/**
 * Copies and validates one language value from a LitAST slot.
 *
 * @param source - LitAST language tuple.
 * @param sourceName - LitAST slot name.
 * @param target - Canonical attribute bag.
 * @param targetName - Canonical slot name.
 * @param path - Diagnostic path.
 */
function copyLanguageValue(
  source: Readonly<Record<string, unknown>>,
  sourceName: "val" | "eastAsia" | "bidi",
  target: Record<string, unknown>,
  targetName: "languageLatin" | "languageEastAsia" | "languageComplexScript",
  path: string
): void {
  const value = source[sourceName];
  if (value === undefined || value === null) return;
  const normalized = normalizeRunLanguage(value);
  if (normalized === null) {
    throw new TypeError(`Unsupported textStyle.lang.${sourceName} at ${path}.`);
  }
  target[targetName] = normalized;
}

/**
 * Copies and validates one canonical language value into a LitAST slot.
 *
 * @param source - Canonical textStyle attributes.
 * @param sourceName - Canonical slot name.
 * @param target - LitAST language tuple.
 * @param targetName - LitAST slot name.
 * @param path - Diagnostic path.
 */
function copyCanonicalLanguageValue(
  source: Readonly<Record<string, unknown>>,
  sourceName: "languageLatin" | "languageEastAsia" | "languageComplexScript",
  target: Record<string, string>,
  targetName: "val" | "eastAsia" | "bidi",
  path: string
): void {
  const value = source[sourceName];
  if (value === undefined || value === null) return;
  const normalized = normalizeRunLanguage(value);
  if (normalized === null) {
    throw new TypeError(`Unsupported textStyle.${sourceName} at ${path}.`);
  }
  target[targetName] = normalized;
}

/**
 * Copies one strict boolean run property without inferring truthiness.
 *
 * @param source - Source text-style attribute bag.
 * @param sourceName - Boolean field to read.
 * @param target - Mutable target attribute bag.
 * @param targetName - Boolean field to write.
 * @param path - Diagnostic path for strict validation errors.
 */
function copyBoolean(
  source: Readonly<Record<string, unknown>>,
  sourceName: BooleanTextStyleField,
  target: Record<string, unknown>,
  targetName: BooleanTextStyleField,
  path: string
): void {
  const value = source[sourceName];
  if (value === undefined || value === null) return;
  if (typeof value !== "boolean") {
    throw new TypeError(`Unsupported textStyle.${sourceName} at ${path}.`);
  }
  target[targetName] = value;
}

/** Boolean LitAST or canonical text-style field copied with exact presence. */
type BooleanTextStyleField =
  | "characterGrid"
  | "snapToGrid"
  | "allCaps"
  | "smallCaps"
  | "boldCs"
  | "italicCs"
  | "rtl"
  | "rightToLeft"
  | "vanish"
  | "hidden"
  | "outline"
  | "shadow"
  | "emboss"
  | "imprint";

/**
 * Copies one canonical false-only ordinary emphasis override.
 *
 * @param source - LitAST or canonical text-style attributes.
 * @param name - Ordinary emphasis field to copy.
 * @param target - Mutable target attribute bag.
 * @param path - Diagnostic path for strict validation errors.
 */
function copyDirectEmphasisOverride(
  source: Readonly<Record<string, unknown>>,
  name: "bold" | "italic",
  target: Record<string, unknown>,
  path: string
): void {
  const value = source[name];
  if (value === undefined || value === null) return;
  if (value !== false) {
    throw new TypeError(
      `Unsupported textStyle.${name} direct override at ${path}; semantic true requires the ${name} mark.`
    );
  }
  target[name] = false;
}

/**
 * Copies and validates one exact emphasis-mark value.
 *
 * @param source - LitAST or canonical text-style attribute bag.
 * @param target - Mutable target attribute bag.
 * @param path - Diagnostic path for strict validation errors.
 */
function copyEmphasisMark(
  source: Readonly<Record<string, unknown>>,
  target: Record<string, unknown>,
  path: string
): void {
  const value = source.emphasisMark;
  if (value === undefined || value === null) return;
  if (!isTextStyleEmphasisMark(value)) {
    throw new TypeError(`Unsupported textStyle.emphasisMark at ${path}.`);
  }
  target.emphasisMark = value;
}

/**
 * Copies one canonical signed character-spacing value.
 *
 * @param source - Source text-style attribute bag.
 * @param target - Mutable target attribute bag.
 * @param path - Diagnostic path for strict validation errors.
 */
function copyLetterSpacing(
  source: Readonly<Record<string, unknown>>,
  target: Record<string, unknown>,
  path: string
): void {
  const value = source.letterSpacing;
  if (value === undefined || value === null) return;
  const normalized = normalizeLetterSpacing(value);
  if (normalized === null) {
    throw new TypeError(`Unsupported textStyle.letterSpacing at ${path}.`);
  }
  target.letterSpacing = normalized;
}

/**
 * Reads a JSON object for callers that operate on nested snapshot values.
 *
 * @param value - Candidate attribute bag.
 * @returns JSON record or an empty record.
 */
export function readTextStyleSnapshotRecord(
  value: unknown
): Readonly<Record<string, unknown>> {
  return readRecord(value) ?? {};
}
