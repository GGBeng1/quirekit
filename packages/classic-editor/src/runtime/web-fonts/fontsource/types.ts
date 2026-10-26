/** Fontsource directory metadata used before binary resolution. */
export interface FontsourceDirectoryItem {
  /** Stable Fontsource slug. */
  readonly id: string;
  /** Exact CSS family. */
  readonly family: string;
  /** Available subset identifiers. */
  readonly subsets: readonly string[];
  /** Available numeric weights. */
  readonly weights: readonly number[];
  /** Available CSS styles. */
  readonly styles: readonly string[];
  /** Provider-preferred primary subset. */
  readonly defSubset: string;
  /** Catalog revision used to detect races during resolution. */
  readonly lastModified: string;
  /** Source-neutral family category. */
  readonly category: string;
  /** SPDX license identifier. */
  readonly license: string;
}

/** One Fontsource subset URL bundle. */
export interface FontsourceVariantSubset {
  /** Supported binary URLs keyed by container format. */
  readonly url: Readonly<Record<string, string>>;
}

/** Resolved Fontsource metadata with exact package version and assets. */
export interface FontsourceFamilyDetails extends FontsourceDirectoryItem {
  /** Exact immutable Fontsource package version. */
  readonly npmVersion: string;
  /** Weight/style/subset asset tree. */
  readonly variants: Readonly<
    Record<string, Readonly<Record<string, Readonly<Record<string, FontsourceVariantSubset>>>>>
  >;
  /** CSS unicode ranges keyed by subset. */
  readonly unicodeRange: Readonly<Record<string, string>>;
}
