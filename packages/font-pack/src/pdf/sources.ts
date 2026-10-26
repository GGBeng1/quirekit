import { quirePortablePdfFontAssets } from "./assets";
import type {
  QuirePortablePdfFontSource,
  QuirePortablePdfFontSourceOptions
} from "./types";

const carlitoPdfFeatures = Object.freeze({
  calt: false,
  clig: false,
  kern: false,
  liga: false,
  rlig: false
});

/**
 * Creates the optional portable native-PDF font sources.
 *
 * The returned sources are metadata-only until the PDF registry selects a
 * face. Applications remain responsible for loading the exported package
 * asset named by each declaration.
 *
 * @param options - Application-owned asset loader.
 * @returns Frozen structurally compatible PDF font sources.
 */
export function createQuirePortablePdfFontSources(
  options: QuirePortablePdfFontSourceOptions
): readonly QuirePortablePdfFontSource[] {
  return Object.freeze(quirePortablePdfFontAssets.map((asset) => Object.freeze({
    id: `quire-font-pack-${asset.id}`,
    family: asset.family,
    acceptedSubstitutions: acceptedSubstitutionsFor(asset.family),
    data: () => options.loadAsset(asset),
    ...(asset.family === "Carlito"
      ? { features: carlitoPdfFeatures }
      : {}),
    fallback: asset.family === "Noto Sans Hans"
      || asset.family === "Noto Sans Symbols 2",
    ...(asset.unicodeRange === undefined
      ? {}
      : { unicodeRange: asset.unicodeRange }),
    weight: asset.weight,
    style: asset.style,
    subset: asset.subset
  })));
}

/**
 * Returns approved logical-family mappings for one physical family.
 *
 * @param family - Portable physical family.
 * @returns Frozen accepted-substitution names.
 */
function acceptedSubstitutionsFor(family: string): readonly string[] {
  if (family === "Carlito") return Object.freeze(["Calibri"]);
  if (family === "Noto Serif SC") {
    return Object.freeze([
      "宋体",
      "SimSun",
      "NSimSun",
      "仿宋",
      "FangSong",
      "FangSong_GB2312"
    ]);
  }
  if (family === "Noto Sans Symbols 2") {
    return Object.freeze([
      "MS Gothic",
      "Segoe UI Symbol",
      "Arial Unicode MS"
    ]);
  }
  return Object.freeze([
    "微软雅黑",
    "Microsoft YaHei",
    "Noto Sans SC",
    "Noto Sans CJK SC",
    "等线",
    "DengXian",
    "黑体",
    "SimHei"
  ]);
}
