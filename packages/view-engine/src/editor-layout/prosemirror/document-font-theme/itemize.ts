import {
  resolveQuireFontSubstitutionCandidates,
  type QuireDocumentFontSet,
  type QuireDocumentFontTable
} from "@quirekit/core";
import {
  readQuireCssFontFamilies,
  replaceQuireCssFontFamilies,
  terminateQuireCssFontFamilies
} from "./css-font";
import { uniqueFamilies } from "./resolve";
import type {
  QuireDocumentFontRun,
  QuireDocumentFontSlot,
  SplitQuireDocumentFontRunsRequest
} from "./types";

/** East Asian ranges used by Word font-slot selection and modern CJK extensions. */
const eastAsianRanges: readonly (readonly [number, number])[] = [
  [0x1100, 0x11ff], [0x2e80, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf], [0xac00, 0xd7af], [0xf900, 0xfaff],
  [0xfe30, 0xfe6f], [0xff00, 0xffef], [0x1aff0, 0x1b2ff], [0x1f200, 0x1f2ff], [0x20000, 0x323af]
];

/** Slot fonts per normalized document table; every run of a layout pass reuses them. */
const slotFonts = new WeakMap<object, Map<string, string>>();
/** Cache key standing for an absent document table. */
const absentTable = {};

/** Unicode scripts that Word resolves through the complex-script font slot. */
const complexScriptPattern = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Thai}\p{Script=Lao}\p{Script=Tibetan}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/**
 * Classifies one Unicode character into a canonical document font slot.
 *
 * Basic Latin deliberately includes U+0020 SPACE. CJK punctuation and
 * full-width forms deliberately use East Asian, matching Word's `rFonts`
 * character classification rather than browser glyph-coverage fallback.
 *
 * @param character - One Unicode character, which may span two UTF-16 units.
 * @returns Canonical document font slot.
 */
export function resolveQuireDocumentFontSlot(
  character: string
): QuireDocumentFontSlot {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) {
    return "latin";
  }
  if (complexScriptPattern.test(character)) {
    return "complexScript";
  }
  return eastAsianRanges.some(([from, to]) => codePoint >= from && codePoint <= to)
    ? "eastAsia"
    : "latin";
}

/**
 * Splits canonical text into adjacent Word-compatible font-slot layout runs.
 *
 * @param request - Text, inherited font, and canonical document font set.
 * @returns Source-contiguous slot runs preserving UTF-16 offsets.
 */
export function splitQuireDocumentFontRuns(
  request: SplitQuireDocumentFontRunsRequest
): readonly QuireDocumentFontRun[] {
  if (request.text.length === 0) {
    return [];
  }
  const runs: QuireDocumentFontRun[] = [];
  let activeSlot: QuireDocumentFontSlot | null = null;
  let activeFrom = 0;
  let offset = 0;

  for (const character of request.text) {
    const slot: QuireDocumentFontSlot = request.forceSlot
      ?? resolveContextualSlot(character, activeSlot, request.resolveSlot);
    if (activeSlot !== null && slot !== activeSlot) {
      runs.push(createFontRun(request, activeFrom, offset, activeSlot));
      activeFrom = offset;
    }
    activeSlot = slot;
    offset += character.length;
  }
  runs.push(createFontRun(request, activeFrom, offset, activeSlot ?? "latin"));
  return runs;
}

/**
 * Keeps combining and variation characters with their preceding font slot.
 *
 * @param character - Current Unicode character.
 * @param previous - Previous resolved slot, when any.
 * @param resolveSlot - Optional document-owned character classification.
 * @returns Context-aware slot.
 */
function resolveContextualSlot(
  character: string,
  previous: QuireDocumentFontSlot | null,
  resolveSlot?: SplitQuireDocumentFontRunsRequest["resolveSlot"]
): QuireDocumentFontSlot {
  return previous !== null && /[\p{Mark}\u200c\u200d\ufe00-\ufe0f]/u.test(character)
    ? previous
    : resolveSlot?.(character) ?? resolveQuireDocumentFontSlot(character);
}

/**
 * Creates one itemized run and assigns its slot-specific family list.
 *
 * @param request - Itemization request.
 * @param from - UTF-16 source start.
 * @param to - UTF-16 source end.
 * @param slot - Selected document font slot.
 * @returns Complete itemized font run.
 */
function createFontRun(
  request: SplitQuireDocumentFontRunsRequest,
  from: number,
  to: number,
  slot: QuireDocumentFontSlot
): QuireDocumentFontRun {
  return {
    from,
    to,
    text: request.text.slice(from, to),
    slot,
    font: resolveSlotFont(request.font, request.fontSet, request.fontTable, slot)
  };
}

/**
 * Builds one slot-specific font shorthand without allowing another script's
 * full-coverage font to capture Latin spaces before a compatible substitute.
 *
 * @param font - Inherited complete font shorthand.
 * @param fontSet - Canonical document font set.
 * @param fontTable - Optional document alternate-name table.
 * @param slot - Selected font slot.
 * @returns Slot-specific CSS font shorthand.
 */
function resolveSlotFont(
  font: string,
  fontSet: QuireDocumentFontSet,
  fontTable: QuireDocumentFontTable | undefined,
  slot: QuireDocumentFontSlot
): string {
  const primary = fontSet[slot];
  const key = `${slot}\u0000${primary ?? ""}\u0000${fontSet.fallbacks?.join("\u0001") ?? ""}\u0000${font}`;
  let cache = slotFonts.get(fontTable ?? absentTable);
  if (cache === undefined || cache.size > 4096) slotFonts.set(fontTable ?? absentTable, cache = new Map());
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const candidates = primary === undefined ? [] : resolveQuireFontSubstitutionCandidates({ requestedFamily: primary, fontTable });
  const families = terminateQuireCssFontFamilies(uniqueFamilies([
    ...candidates.map((candidate) => candidate.family), ...(fontSet.fallbacks ?? []), ...readQuireCssFontFamilies(font)
  ]));
  const resolved = replaceQuireCssFontFamilies(font, families);
  cache.set(key, resolved);
  return resolved;
}
