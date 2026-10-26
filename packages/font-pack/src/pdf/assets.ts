import type {
  QuirePortablePdfFontAsset,
  QuirePortablePdfFontStyle
} from "./types";

/** Complete static faces published by the optional portable PDF preset. */
export const quirePortablePdfFontAssets:
readonly QuirePortablePdfFontAsset[] = Object.freeze([
  createAsset(
    "carlito-400-normal",
    "Carlito-Regular.ttf",
    "Carlito",
    400,
    "normal",
    true
  ),
  createAsset(
    "carlito-400-italic",
    "Carlito-Italic.ttf",
    "Carlito",
    400,
    "italic",
    true
  ),
  createAsset(
    "carlito-700-normal",
    "Carlito-Bold.ttf",
    "Carlito",
    700,
    "normal",
    true
  ),
  createAsset(
    "carlito-700-italic",
    "Carlito-BoldItalic.ttf",
    "Carlito",
    700,
    "italic",
    true
  ),
  createAsset(
    "noto-serif-sc-400-normal",
    "NotoSerifSC-Regular.ttf",
    "Noto Serif SC",
    400,
    "normal",
    true
  ),
  createAsset(
    "noto-serif-sc-700-normal",
    "NotoSerifSC-Bold.ttf",
    "Noto Serif SC",
    700,
    "normal",
    true
  ),
  createAsset(
    "noto-sans-hans-400-normal",
    "NotoSansHans-Regular.otf",
    "Noto Sans Hans",
    400,
    "normal",
    true
  ),
  createAsset(
    "noto-sans-hans-700-normal",
    "NotoSansHans-Bold.otf",
    "Noto Sans Hans",
    700,
    "normal",
    true
  ),
  createAsset(
    "noto-sans-symbols-2-400-normal",
    "NotoSansSymbols2-Regular.ttf",
    "Noto Sans Symbols 2",
    400,
    "normal",
    true,
    "U+25A0-27BF"
  )
]);

/**
 * Creates one immutable portable PDF font asset declaration.
 *
 * @param id - Stable asset identifier.
 * @param fileName - Exported package file name.
 * @param family - Physical font family.
 * @param weight - Numeric CSS weight.
 * @param style - CSS posture.
 * @param subset - Whether PDF subsetting is enabled.
 * @param unicodeRange - Optional negative-prefilter range for PDF routing.
 * @returns Frozen asset declaration.
 */
function createAsset(
  id: QuirePortablePdfFontAsset["id"],
  fileName: string,
  family: string,
  weight: number,
  style: QuirePortablePdfFontStyle,
  subset: boolean,
  unicodeRange?: string
): QuirePortablePdfFontAsset {
  return Object.freeze({
    id,
    fileName,
    family,
    weight,
    style,
    subset,
    ...(unicodeRange === undefined ? {} : { unicodeRange })
  });
}
