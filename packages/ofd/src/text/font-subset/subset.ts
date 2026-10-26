import { subsetWithHarfBuzz } from "./runtime";
import {
  copyFontBytes,
  detectSfntType,
  normalizeCodePoints
} from "./sfnt";
import type { OFDFontSubsetOptions } from "./types";
import { validateSubset } from "./validation";

/**
 * Creates a standalone source-flavor-preserving subset for OFD embedding.
 *
 * The subset keeps an intrinsic Unicode cmap instead of relying on the
 * external character maps available to PDF font programs. Source and result
 * are reopened with an independent parser, and every demanded glyph must
 * preserve its advance, bounds, and vector path.
 *
 * @param data - Complete TrueType or OpenType font bytes.
 * @param options - Requested Unicode coverage and optional table policy.
 * @returns Validated standalone TrueType or OpenType subset bytes.
 */
export async function subsetOFDFont(
  data: Uint8Array | ArrayBuffer,
  options: OFDFontSubsetOptions
): Promise<Uint8Array> {
  const source = copyFontBytes(data);
  const sourceType = detectSfntType(source);
  if (!sourceType) {
    throw new TypeError(
      "OFD font subsetting requires complete TrueType or OpenType bytes."
    );
  }
  const codePoints = normalizeCodePoints(options.codePoints);
  const preserveHinting = options.preserveHinting ?? false;
  const preserveKerning = options.preserveKerning ?? false;

  let subset: Uint8Array;
  try {
    subset = new Uint8Array(await subsetWithHarfBuzz(
      source,
      codePoints,
      preserveHinting,
      preserveKerning
    ));
  } catch (error) {
    throw new TypeError("The OFD font subset could not be encoded.", {
      cause: error
    });
  }

  validateSubset(source, subset, sourceType, codePoints);
  return subset;
}
