import {
  create,
  type Font,
  type FontCollection,
  type Glyph,
  type PathCommand
} from "fontkit";
import {
  detectSfntType,
  validateSfntTableDirectory
} from "./sfnt";
import type { OFDSfntType } from "./types";

/**
 * Proves that a subset is standalone and preserves every demanded glyph.
 *
 * @param sourceData - Complete source face bytes.
 * @param subsetData - Candidate subset bytes.
 * @param sourceType - Source outline flavor.
 * @param codePoints - Required Unicode scalar values.
 */
export function validateSubset(
  sourceData: Uint8Array,
  subsetData: Uint8Array,
  sourceType: OFDSfntType,
  codePoints: readonly number[]
): void {
  if (detectSfntType(subsetData) !== sourceType) {
    throw new TypeError(
      `The OFD font subset did not preserve the source ${sourceType.toUpperCase()} flavor.`
    );
  }
  validateSfntTableDirectory(subsetData);

  const source = parseStandaloneFont(sourceData, "source");
  const subset = parseStandaloneFont(subsetData, "subset");
  if (source.unitsPerEm !== subset.unitsPerEm) {
    throw new TypeError("The OFD font subset changed the units-per-em scale.");
  }

  // Unicode coverage and visible outline geometry are independent invariants:
  // a valid cmap can still address a glyph whose outline was corrupted.
  for (const codePoint of codePoints) {
    const sourceGlyph = source.glyphForCodePoint(codePoint);
    const subsetGlyph = subset.glyphForCodePoint(codePoint);
    if (!isAddressableGlyph(sourceGlyph)) {
      throw new TypeError(
        `The OFD source font does not map ${formatCodePoint(codePoint)}.`
      );
    }
    if (!isAddressableGlyph(subsetGlyph)) {
      throw new TypeError(
        `The OFD font subset does not map ${formatCodePoint(codePoint)}.`
      );
    }
    validateGlyphFidelity(sourceGlyph, subsetGlyph, codePoint);
  }
}

/**
 * Reopens one sfnt face through the independent parser.
 *
 * @param data - Complete standalone font bytes.
 * @param label - Stable diagnostic role.
 * @returns Independently parsed physical face.
 */
function parseStandaloneFont(
  data: Uint8Array,
  label: "source" | "subset"
): Font {
  let parsed: Font | FontCollection;
  try {
    parsed = create(data as unknown as Parameters<typeof create>[0]);
  } catch (error) {
    throw new TypeError(`The OFD font ${label} cannot be reopened.`, {
      cause: error
    });
  }
  if (isFontCollection(parsed)) {
    throw new TypeError(
      `The OFD font ${label} unexpectedly contains a collection.`
    );
  }
  return parsed;
}

/**
 * Checks that one parser result names a real glyph rather than `.notdef`.
 *
 * @param glyph - Parser glyph result, which may be absent for malformed faces.
 * @returns Whether the glyph is safe to address.
 */
function isAddressableGlyph(
  glyph: Glyph | null | undefined
): glyph is Glyph {
  return glyph !== null && glyph !== undefined && glyph.id !== 0;
}

/**
 * Compares visible geometry and horizontal metrics for one demanded glyph.
 *
 * @param source - Source glyph authority.
 * @param subset - Renumbered final glyph.
 * @param codePoint - Demanded Unicode scalar.
 */
function validateGlyphFidelity(
  source: Glyph,
  subset: Glyph,
  codePoint: number
): void {
  if (source.advanceWidth !== subset.advanceWidth) {
    throw createFidelityError(codePoint, "advance");
  }
  for (const key of ["minX", "minY", "maxX", "maxY"] as const) {
    if (source.bbox[key] !== subset.bbox[key]) {
      throw createFidelityError(codePoint, "outline bounds");
    }
  }
  validatePathCommands(source.path.commands, subset.path.commands, codePoint);
}

/**
 * Compares normalized vector commands without relying on glyph ids.
 *
 * @param source - Source path command sequence.
 * @param subset - Final path command sequence.
 * @param codePoint - Demanded Unicode scalar.
 */
function validatePathCommands(
  source: readonly PathCommand[],
  subset: readonly PathCommand[],
  codePoint: number
): void {
  if (source.length !== subset.length) {
    throw createFidelityError(codePoint, "outline path");
  }
  for (let index = 0; index < source.length; index += 1) {
    const sourceCommand = source[index]!;
    const subsetCommand = subset[index]!;
    if (
      sourceCommand.command !== subsetCommand.command
      || sourceCommand.args.length !== subsetCommand.args.length
      || sourceCommand.args.some(
        (value, argumentIndex) => value !== subsetCommand.args[argumentIndex]
      )
    ) {
      throw createFidelityError(codePoint, "outline path");
    }
  }
}

/**
 * Creates one stable outline-fidelity rejection.
 *
 * @param codePoint - Demanded Unicode scalar.
 * @param field - Mismatched visible evidence.
 * @returns Typed validation failure.
 */
function createFidelityError(
  codePoint: number,
  field: string
): TypeError {
  return new TypeError(
    `The OFD font subset changed ${formatCodePoint(codePoint)} ${field}.`
  );
}

/**
 * Narrows fontkit's structurally overlapping font return types.
 *
 * @param value - Parsed font or collection.
 * @returns Whether the parser returned a collection.
 */
function isFontCollection(
  value: Font | FontCollection
): value is FontCollection {
  return "fonts" in value;
}

/**
 * Formats one Unicode scalar for stable diagnostics.
 *
 * @param codePoint - Unicode scalar value.
 * @returns Uppercase `U+` notation.
 */
function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}
