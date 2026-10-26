import {
  normalizeQuireDocumentFontTheme,
  quireDefaultDocumentFontTheme,
  type QuireEditor,
  type QuireNodeCanvasTextStyle
} from "@quirekit/core";
import type { ClassicEditorLocale } from "../../../types";
import { resolveQuireDocumentFontSlot } from "@quirekit/view-engine";
import { collectClassicSelectedCanvasStyles } from "./canvas-style";
import type {
  ClassicEffectiveFontTarget,
  ClassicEffectiveFormatSample,
  ClassicEffectiveFormatState,
  ClassicEffectiveScriptSlot,
  ClassicSelectedTextSegment
} from "./types";
import {
  collectClassicSelectedTextSegments,
  compareClassicEffectiveSamples,
  findClassicTextStyleMark,
  resolveClassicNodeTextStyle
} from "./selection";

const eastAsianScriptPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}]/u;
const latinScriptPattern = /\p{Script=Latin}/u;

/**
 * Resolves the logical effective font family at the caret or selection.
 *
 * @param editor - Mounted Core editor whose current selection should be read.
 * @param target - All-script authoring mode or one explicit script slot.
 * @param locale - Product locale used only when an empty caret has no script hint.
 * @returns One logical requested family or an explicit mixed state.
 */
export function resolveClassicEffectiveFontFamily(
  editor: QuireEditor,
  target: ClassicEffectiveFontTarget,
  locale: ClassicEditorLocale
): ClassicEffectiveFormatState<string> {
  const theme = normalizeQuireDocumentFontTheme(editor.state.doc.attrs.fontTheme)
    ?? quireDefaultDocumentFontTheme;
  const samples = collectClassicSelectedTextSegments(editor).flatMap((segment) => {
    const nodeStyle = resolveClassicNodeTextStyle(editor, segment.textblock);
    const slots = target === "all"
      ? resolveClassicTextScriptSlots(segment.text, locale)
      : [target];
    return slots.map((slot) => resolveClassicFontFamilySample(
      editor,
      segment,
      slot,
      nodeStyle,
      theme
    ));
  });

  return compareClassicEffectiveSamples(samples, (left, right) => left === right);
}

/**
 * Resolves one family sample from direct slots and inherited document theme.
 *
 * @param editor - Editor providing inherited character-style contributions.
 * @param segment - Selected text and owning block.
 * @param slot - Script slot to resolve.
 * @param nodeStyle - Extension-owned node base style.
 * @param theme - Normalized document theme.
 * @returns Comparable logical family sample.
 */
function resolveClassicFontFamilySample(
  editor: QuireEditor,
  segment: ClassicSelectedTextSegment,
  slot: ClassicEffectiveScriptSlot,
  nodeStyle: QuireNodeCanvasTextStyle | null,
  theme: NonNullable<ReturnType<typeof normalizeQuireDocumentFontTheme>>
): ClassicEffectiveFormatSample<string> {
  const attributes = findClassicTextStyleMark(segment.marks)?.attrs;
  const generic = readClassicFontFamily(attributes?.fontFamily);
  if (slot === "complexScript") {
    // Reuse semantic style ordering; Latin-only overrides cannot capture this slot.
    let family: string | null = null;
    for (const delta of collectClassicSelectedCanvasStyles(editor, [segment])[0] ?? []) {
      family = readClassicFontFamily(delta.fontFamilyComplexScript)
        ?? readClassicFontFamily(delta.fontFamily) ?? family;
    }
    const role = nodeStyle?.documentFontRole === "heading" ? theme.heading ?? theme.body : theme.body;
    return {
      value: family ?? role.complexScript ?? role.latin ?? role.eastAsia
        ?? quireDefaultDocumentFontTheme.body.complexScript ?? "sans-serif",
      hasDirect: (readClassicFontFamily(attributes?.fontFamilyComplexScript) ?? generic) !== null
    };
  }
  const direct = slot === "eastAsia"
    ? readClassicFontFamily(attributes?.fontFamilyEastAsia) ?? generic
    : readClassicFontFamily(attributes?.fontFamilyLatin) ?? generic;
  if (direct !== null) return { value: direct, hasDirect: true };

  const nodeFamily = readClassicFontFamily(nodeStyle?.fontFamily);
  if (nodeFamily !== null) return { value: nodeFamily, hasDirect: false };

  const role = (
    nodeStyle?.documentFontRole
    ?? (segment.textblock.type.name === "heading" ? "heading" : "body")
  ) === "heading"
    ? theme.heading ?? theme.body
    : theme.body;
  const inherited = slot === "eastAsia"
    ? role.eastAsia ?? role.latin
    : role.latin ?? role.eastAsia;
  const fallback = slot === "eastAsia"
    ? quireDefaultDocumentFontTheme.body.eastAsia
    : quireDefaultDocumentFontTheme.body.latin;
  return { value: inherited ?? fallback ?? "sans-serif", hasDirect: false };
}

/**
 * Resolves script slots used by selected text without treating punctuation as
 * an independent font family.
 *
 * @param text - Selected text or nearby caret hint.
 * @param locale - Product locale used when no strong script character exists.
 * @returns Distinct script slots in source order.
 */
function resolveClassicTextScriptSlots(
  text: string,
  locale: ClassicEditorLocale
): readonly ClassicEffectiveScriptSlot[] {
  const characters = Array.from(text);
  const localeFallback: ClassicEffectiveScriptSlot =
    locale === "zh-CN" ? "eastAsia" : "latin";
  const firstStrong = characters
    .map(readClassicStrongScriptSlot)
    .find((slot) => slot !== null) ?? localeFallback;
  const slots: ClassicEffectiveScriptSlot[] = [];
  let current = firstStrong;

  for (const character of characters) {
    current = readClassicStrongScriptSlot(character) ?? current;
    if (!slots.includes(current)) slots.push(current);
  }

  return slots.length === 0 ? [localeFallback] : slots;
}

/**
 * Classifies one strong character while retaining neutral punctuation behavior.
 *
 * @param character - One Unicode character.
 * @returns Script slot or null for neutral punctuation, symbols, and digits.
 */
function readClassicStrongScriptSlot(
  character: string
): ClassicEffectiveScriptSlot | null {
  if (eastAsianScriptPattern.test(character)) return "eastAsia";
  if (resolveQuireDocumentFontSlot(character) === "complexScript") return "complexScript";
  return latinScriptPattern.test(character) ? "latin" : null;
}

/**
 * Reads one non-empty logical font-family value.
 *
 * @param value - Candidate canonical or inherited family.
 * @returns Trimmed family or null.
 */
function readClassicFontFamily(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
