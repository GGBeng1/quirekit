import type {
  WordNumberingLevel,
  WordNumberingLanguage,
  WordNumberingMarkerFonts,
  WordNumberingMarkerStyle
} from "../types";
import type { WordNumberingSingleLevelPreset } from "../presets";
import type {
  WordNumberingTemplateLevelOverride,
  WordNumberingTemplateLanguageOverride,
  WordNumberingTemplateMarkerFontsOverride,
  WordNumberingTemplateMarkerStyleOverride,
  WordNumberingTemplateRestartRule
} from "./types";

/**
 * Applies a partial override to one portable current-level tuple.
 *
 * @param base - Complete portable base level.
 * @param override - Friendly fields explicitly changed by the caller.
 * @returns Complete portable tuple ready for preset normalization.
 */
export function mergeSingleLevel(
  base: WordNumberingSingleLevelPreset,
  override: WordNumberingTemplateLevelOverride
): WordNumberingSingleLevelPreset {
  const merged = mergeCanonicalLevel({ ...base, level: 0 }, override);
  const {
    level: _level,
    restartAfterLevel,
    ...portable
  } = merged;
  return {
    ...portable,
    ...(restartAfterLevel === null ? { restartAfterLevel: null } : {})
  };
}

/**
 * Merges one partial level without allowing nested objects to replace siblings.
 *
 * @param base - Complete inherited canonical level.
 * @param override - Optional explicit fields for the same level.
 * @returns Complete candidate canonical level.
 */
export function mergeCanonicalLevel(
  base: WordNumberingLevel,
  override: WordNumberingTemplateLevelOverride | undefined
): WordNumberingLevel {
  if (override === undefined) return base;
  const restartAfterLevel = resolveRestart(
    base.restartAfterLevel,
    override.restartAfterLevel
  );
  const markerStyle = mergeMarkerStyle(base.markerStyle, override.markerStyle);
  return {
    ...base,
    level: base.level,
    format: override.format ?? base.format,
    customFormat: undefined,
    ...resolveOptionalField(
      "customFormat",
      (override.format ?? base.format) === "custom" ? base.customFormat : undefined,
      override.customFormat
    ),
    text: override.text ?? base.text,
    start: override.start ?? base.start,
    restartAfterLevel,
    suffix: override.suffix ?? base.suffix,
    justification: override.justification ?? base.justification,
    paragraphIndentation: {
      start: resolveNullableField(
        base.paragraphIndentation.start,
        override.paragraphIndentation?.start
      ),
      end: resolveNullableField(
        base.paragraphIndentation.end,
        override.paragraphIndentation?.end
      ),
      firstLine: resolveNullableField(
        base.paragraphIndentation.firstLine,
        override.paragraphIndentation?.firstLine
      )
    },
    markerStyle
  };
}

/**
 * Preserves explicit null while omission inherits the base.
 *
 * @param base - Inherited canonical value.
 * @param override - Explicit value, null, or omission.
 * @returns Effective canonical value.
 */
function resolveNullableField<T>(
  base: T | null,
  override: T | null | undefined
): T | null {
  return override === undefined ? base : override;
}

/**
 * Resolves the friendly explicit-default restart sentinel.
 *
 * @param base - Inherited canonical restart rule.
 * @param override - Friendly restart override.
 * @returns Canonical ancestor, never, or omitted default.
 */
function resolveRestart(
  base: number | null | undefined,
  override: WordNumberingTemplateRestartRule | undefined
): number | null | undefined {
  if (override === undefined) return base;
  return override === "default" ? undefined : override;
}

/**
 * Merges marker typography while allowing explicit inherited fields to clear.
 *
 * @param base - Inherited marker-only style.
 * @param override - Partial style, null to clear, or omission to inherit.
 * @returns Canonical marker style or omission.
 */
function mergeMarkerStyle(
  base: WordNumberingMarkerStyle | undefined,
  override: WordNumberingTemplateMarkerStyleOverride | null | undefined
): WordNumberingMarkerStyle | undefined {
  if (override === undefined || (override !== null && Object.keys(override).length === 0)) return base;
  if (override === null) return undefined;
  const fonts = mergeMarkerFonts(base?.fonts, override.fonts);
  const language = mergeMarkerLanguage(base?.language, override.language);
  return {
    ...(fonts === undefined ? {} : { fonts }),
    ...(language === undefined ? {} : { language }),
    ...resolveOptionalField("fontSizePt", base?.fontSizePt, override.fontSizePt),
    ...resolveOptionalField(
      "complexScriptFontSizePt",
      base?.complexScriptFontSizePt,
      override.complexScriptFontSizePt
    ),
    ...resolveOptionalField("bold", base?.bold, override.bold),
    ...resolveOptionalField(
      "complexScriptBold",
      base?.complexScriptBold,
      override.complexScriptBold
    ),
    ...resolveOptionalField("italic", base?.italic, override.italic),
    ...resolveOptionalField(
      "complexScriptItalic",
      base?.complexScriptItalic,
      override.complexScriptItalic
    ),
    ...resolveOptionalField("color", base?.color, override.color),
    ...resolveOptionalField("underline", base?.underline, override.underline),
    ...resolveOptionalField("strike", base?.strike, override.strike)
  };
}

/**
 * Merges marker language slots while permitting explicit removal.
 *
 * @param base - Inherited marker language slots.
 * @param override - Partial slots, null to clear all, or omission to inherit.
 * @returns Canonical marker language or omission.
 */
function mergeMarkerLanguage(
  base: WordNumberingLanguage | undefined,
  override: WordNumberingTemplateLanguageOverride | null | undefined
): WordNumberingLanguage | undefined {
  if (override === undefined || (override !== null && Object.keys(override).length === 0)) return base;
  if (override === null) return undefined;
  return {
    ...resolveOptionalField("value", base?.value, override.value),
    ...resolveOptionalField("eastAsia", base?.eastAsia, override.eastAsia),
    ...resolveOptionalField("bidi", base?.bidi, override.bidi)
  };
}

/**
 * Merges marker font slots while permitting explicit removal of one slot.
 *
 * @param base - Inherited font slots.
 * @param override - Partial slots, null to clear all, or omission to inherit.
 * @returns Canonical marker fonts or omission.
 */
function mergeMarkerFonts(
  base: WordNumberingMarkerFonts | undefined,
  override: WordNumberingTemplateMarkerFontsOverride | null | undefined
): WordNumberingMarkerFonts | undefined {
  if (override === undefined || (override !== null && Object.keys(override).length === 0)) return base;
  if (override === null) return undefined;
  return {
    ...resolveOptionalField("ascii", base?.ascii, override.ascii),
    ...resolveOptionalField("highAnsi", base?.highAnsi, override.highAnsi),
    ...resolveOptionalField("eastAsia", base?.eastAsia, override.eastAsia),
    ...resolveOptionalField(
      "complexScript",
      base?.complexScript,
      override.complexScript
    ),
    ...resolveOptionalField("asciiTheme", base?.asciiTheme, override.asciiTheme),
    ...resolveOptionalField(
      "highAnsiTheme",
      base?.highAnsiTheme,
      override.highAnsiTheme
    ),
    ...resolveOptionalField(
      "eastAsiaTheme",
      base?.eastAsiaTheme,
      override.eastAsiaTheme
    ),
    ...resolveOptionalField(
      "complexScriptTheme",
      base?.complexScriptTheme,
      override.complexScriptTheme
    ),
    ...resolveOptionalField("hint", base?.hint, override.hint)
  };
}

/**
 * Resolves one nullable friendly property into an optional canonical property.
 *
 * @param key - Canonical property name.
 * @param base - Inherited value.
 * @param override - Explicit value, null to clear, or omission to inherit.
 * @returns Empty or single-property object suitable for object composition.
 */
function resolveOptionalField<K extends string, T>(
  key: K,
  base: T | undefined,
  override: T | null | undefined
): Partial<Record<K, T>> {
  const value = override === undefined
    ? base
    : override === null
      ? undefined
      : override;
  return value === undefined ? {} : { [key]: value } as Record<K, T>;
}
