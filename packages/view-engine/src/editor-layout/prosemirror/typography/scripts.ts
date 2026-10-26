import type { QuireDocumentFontSet, QuireDocumentLanguageSet, QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { Mark as ProseMirrorMark } from "@quirekit/pm";
import type { QuireComplexScriptEmphasis } from "@quirekit/layout/text";
import { styleDeltas, readFontFamilyList, readNonEmptyStyleValue } from "./shared";

/**
 * Resolves complex-script emphasis without affecting Latin or East Asian runs.
 *
 * @param marks - Marks applied to the canonical source run.
 * @param resolveMarkStyle - Optional resolver for per-mark canvas deltas.
 * @param nodeStyle - Inherited textblock and semantic style properties.
 * @returns Last declared complex-script weight/style, or undefined.
 */
export function resolveQuireMarkedComplexScriptEmphasis(
  marks: readonly ProseMirrorMark[],
  resolveMarkStyle?: QuireMarkCanvasStyleResolver,
  nodeStyle?: QuireNodeCanvasTextStyle | null
): QuireComplexScriptEmphasis | undefined {
  let fontWeight: "normal" | "bold" | undefined;
  let fontStyle: "normal" | "italic" | undefined;
  let fontSize: string | undefined;
  for (const delta of styleDeltas(marks, resolveMarkStyle, nodeStyle)) {
    if (delta?.fontWeightComplexScript !== undefined) {
      fontWeight = delta.fontWeightComplexScript;
    }
    if (delta?.fontStyleComplexScript !== undefined) {
      fontStyle = delta.fontStyleComplexScript;
    }
    if (
      typeof delta?.fontSizeComplexScript === "string"
      && delta.fontSizeComplexScript.trim().length > 0
    ) {
      fontSize = delta.fontSizeComplexScript.trim();
    }
  }
  return fontWeight === undefined && fontStyle === undefined && fontSize === undefined
    ? undefined
    : { fontWeight, fontStyle, fontSize };
}

/**
 * Resolves explicit script-family overrides contributed by inline marks.
 *
 * A generic direct family fills every script slot unless a script-specific
 * field overrides it. Returning a set for generic-only formatting keeps direct
 * and inherited document families on the same itemization and substitution
 * path, so reapplying the effective default family is geometry-idempotent.
 *
 * @param marks - Marks applied to the inline run.
 * @param resolveMarkStyle - Optional resolver for per-mark canvas style deltas.
 * @param nodeStyle - Inherited textblock and semantic style properties.
 * @returns Direct script font set, or undefined when marks are not slot-aware.
 */
export function resolveQuireMarkedFontSet(
  marks: readonly ProseMirrorMark[],
  resolveMarkStyle?: QuireMarkCanvasStyleResolver,
  nodeStyle?: QuireNodeCanvasTextStyle | null
): QuireDocumentFontSet | undefined {
  let genericFamilies: readonly string[] = [];
  let latin: string | undefined;
  let eastAsia: string | undefined;
  let complexScript: string | undefined;
  let hasScriptOverride = false;

  for (const delta of styleDeltas(marks, resolveMarkStyle, nodeStyle)) {
    if (!delta) continue;

    const nextGenericFamilies = readFontFamilyList(delta.fontFamily);
    if (nextGenericFamilies.length > 0) { latin = undefined; eastAsia = undefined; complexScript = undefined; hasScriptOverride = false; }
    genericFamilies = nextGenericFamilies.length === 0
      ? genericFamilies
      : nextGenericFamilies;
    const nextLatin = readNonEmptyStyleValue(delta.fontFamilyLatin);
    const nextEastAsia = readNonEmptyStyleValue(delta.fontFamilyEastAsia);
    const nextComplexScript = readNonEmptyStyleValue(delta.fontFamilyComplexScript);
    if (nextLatin !== undefined) {
      latin = nextLatin;
      hasScriptOverride = true;
    }
    if (nextEastAsia !== undefined) {
      eastAsia = nextEastAsia;
      hasScriptOverride = true;
    }
    if (nextComplexScript !== undefined) {
      complexScript = nextComplexScript;
      hasScriptOverride = true;
    }
  }

  const generic = genericFamilies[0];
  if (!hasScriptOverride && generic === undefined) return undefined;
  const resolvedLatin = latin ?? generic;
  const resolvedEastAsia = eastAsia ?? generic;
  const resolvedComplexScript = complexScript ?? generic;
  return {
    ...(resolvedLatin === undefined ? {} : { latin: resolvedLatin }),
    ...(resolvedEastAsia === undefined ? {} : { eastAsia: resolvedEastAsia }),
    ...(resolvedComplexScript === undefined
      ? {}
      : { complexScript: resolvedComplexScript }),
    ...(genericFamilies.length <= 1
      ? {}
      : { fallbacks: genericFamilies.slice(1) })
  };
}

/**
 * Resolves the three independent Word-compatible run-language slots.
 *
 * Last write wins per slot in mark order. Unlike a font family preset, one
 * language slot never fills another implicitly because the three values have
 * independent proofing, accessibility, and shaping semantics.
 *
 * @param marks - Marks applied to the canonical source run.
 * @param resolveMarkStyle - Optional resolver for per-mark canvas deltas.
 * @param nodeStyle - Effective document and paragraph-style language defaults.
 * @returns Effective script language set, or undefined when no slot is present.
 */
export function resolveQuireMarkedLanguageSet(
  marks: readonly ProseMirrorMark[],
  resolveMarkStyle?: QuireMarkCanvasStyleResolver,
  nodeStyle?: QuireNodeCanvasTextStyle | null
): QuireDocumentLanguageSet | undefined {
  let latin = readNonEmptyStyleValue(nodeStyle?.languageLatin);
  let eastAsia = readNonEmptyStyleValue(nodeStyle?.languageEastAsia);
  let complexScript = readNonEmptyStyleValue(nodeStyle?.languageComplexScript);
  for (const mark of marks) {
    const delta = resolveMarkStyle?.(mark);
    if (delta === null || delta === undefined) continue;
    latin = readNonEmptyStyleValue(delta.languageLatin) ?? latin;
    eastAsia = readNonEmptyStyleValue(delta.languageEastAsia) ?? eastAsia;
    complexScript = readNonEmptyStyleValue(delta.languageComplexScript)
      ?? complexScript;
  }
  return latin === undefined
    && eastAsia === undefined
    && complexScript === undefined
    ? undefined
    : {
        ...(latin === undefined ? {} : { latin }),
        ...(eastAsia === undefined ? {} : { eastAsia }),
        ...(complexScript === undefined ? {} : { complexScript })
      };
}
