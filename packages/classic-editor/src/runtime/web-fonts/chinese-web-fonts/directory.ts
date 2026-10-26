import { normalizeQuireWebFontFamily } from "@quirekit/web-fonts";
import type { ClassicEditorWebFontFamily } from "../../../types";

/** One CSS descriptor published in the Chinese Web Fonts directory. */
export interface ChineseWebFontsRemotePath {
  /** Repository-relative CSS file path. */
  readonly path: string;
  /** CSS identity and face descriptors declared by the directory. */
  readonly css: {
    /** Exact CSS font-family value. */
    readonly family: string;
    /** CSS font-style descriptor. */
    readonly style: string;
    /** CSS font-weight descriptor or range. */
    readonly weight: string;
  };
}

/** One normalized, importable CSS family from the provider directory. */
export interface ChineseWebFontsDirectoryFamily {
  /** Package id used by the provider's npm scope. */
  readonly packageId: string;
  /** Human-facing Chinese or upstream font name. */
  readonly displayName: string;
  /** Exact CSS family used by the editor and FontFace registration. */
  readonly family: string;
  /** Product-neutral visual category inferred from provider metadata. */
  readonly category: string;
  /** Distinct style/weight stylesheets composing this family. */
  readonly remotePaths: readonly ChineseWebFontsRemotePath[];
}

/**
 * Parses the provider's public JSON index into distinct CSS families.
 *
 * @param value - Unknown directory response body.
 * @returns Stable, display-name-sorted importable families.
 */
export function parseChineseWebFontsDirectory(
  value: unknown
): readonly ChineseWebFontsDirectoryFamily[] {
  if (!isRecord(value)) throw new Error("Chinese Web Fonts directory is not an object.");
  const families = new Map<string, ChineseWebFontsDirectoryFamily>();

  // A package may publish several CSS family names and several weights for one
  // family. Group by the browser-visible identity while retaining one sheet per
  // descriptor so imported manifests stay atomic and deterministic.
  for (const [packageId, candidate] of Object.entries(value)) {
    if (!isDirectoryEntry(candidate)) continue;
    const grouped = new Map<string, ChineseWebFontsRemotePath[]>();
    for (const remotePath of candidate.remotePath) {
      const key = normalizeQuireWebFontFamily(remotePath.css.family);
      const current = grouped.get(key) ?? [];
      const descriptor = `${remotePath.css.style}\u0000${remotePath.css.weight}`;
      if (!current.some((entry) => (
        `${entry.css.style}\u0000${entry.css.weight}` === descriptor
      ))) current.push(remotePath);
      grouped.set(key, current);
    }
    for (const [key, remotePaths] of grouped) {
      const family = remotePaths[0]?.css.family;
      if (!family || families.has(key)) continue;
      families.set(key, {
        packageId,
        displayName: candidate.name,
        family,
        category: inferCategory(candidate.name, family),
        remotePaths
      });
    }
  }
  return [...families.values()].sort((left, right) => (
    left.displayName.localeCompare(right.displayName, "zh-CN")
      || left.family.localeCompare(right.family, "en-US")
  ));
}

/**
 * Converts one provider-directory family into Classic's public search record.
 *
 * @param entry - Normalized provider directory family.
 * @returns Source-neutral Hub metadata with an authoritative notice link.
 */
export function toClassicChineseWebFontFamily(
  entry: ChineseWebFontsDirectoryFamily
): ClassicEditorWebFontFamily {
  return {
    family: entry.family,
    displayName: entry.displayName,
    sourceId: "chinese-web-fonts",
    sourceLabel: "中文网字计划",
    category: entry.category,
    subsets: ["cjk"],
    variants: entry.remotePaths.map((remotePath) => (
      `${remotePath.css.weight}${remotePath.css.style === "normal"
        ? ""
        : ` ${remotePath.css.style}`}`
    )),
    license: {
      name: "字体许可与来源说明",
      url: `https://github.com/KonghaYao/chinese-free-web-font-storage/tree/branch/packages/${encodeURIComponent(entry.packageId)}`
    }
  };
}

/**
 * Reports whether one provider family matches a local Hub query.
 *
 * @param entry - Provider family to test.
 * @param query - Trimmed lowercase query.
 * @returns Whether names, identity, package id, or category aliases match.
 */
export function matchesChineseWebFont(
  entry: ChineseWebFontsDirectoryFamily,
  query: string
): boolean {
  if (query.length === 0) return true;
  const terms = [
    entry.displayName,
    entry.family,
    entry.packageId,
    entry.category,
    ...(CATEGORY_ALIASES[entry.category] ?? [])
  ].map((term) => term.toLocaleLowerCase("zh-CN"));
  return terms.some((term) => term.includes(query));
}

const CATEGORY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  display: ["标题", "展示", "艺术"],
  handwriting: ["手写", "楷体", "行书", "书法"],
  monospace: ["等宽", "点阵", "像素"],
  "sans-serif": ["黑体", "无衬线"],
  serif: ["宋体", "明朝", "衬线"]
};

/**
 * Infers a compact product category without changing provider metadata.
 *
 * @param displayName - Provider-facing name.
 * @param family - CSS family name.
 * @returns Source-neutral category token.
 */
function inferCategory(displayName: string, family: string): string {
  const value = `${displayName} ${family}`.toLocaleLowerCase("zh-CN");
  if (/mono|等宽|点阵|像素|bitmap/u.test(value)) return "monospace";
  if (/楷|行书|手写|书法|wenkai|\bkai\b|script/u.test(value)) return "handwriting";
  if (/宋|明朝|mincho|serif/u.test(value)) return "serif";
  if (/黑|sans|gothic|\bhei\b/u.test(value)) return "sans-serif";
  return "display";
}

/**
 * Validates one provider directory entry.
 *
 * @param value - Candidate package record.
 * @returns Whether it contains a name and valid CSS paths.
 */
function isDirectoryEntry(value: unknown): value is {
  readonly name: string;
  readonly remotePath: readonly ChineseWebFontsRemotePath[];
} {
  if (!isRecord(value) || typeof value.name !== "string" || !Array.isArray(value.remotePath)) {
    return false;
  }
  return value.remotePath.length > 0 && value.remotePath.every(isRemotePath);
}

/**
 * Validates one remote stylesheet descriptor.
 *
 * @param value - Candidate remote path.
 * @returns Whether required path and CSS strings are present.
 */
function isRemotePath(value: unknown): value is ChineseWebFontsRemotePath {
  return isRecord(value)
    && typeof value.path === "string"
    && isRecord(value.css)
    && typeof value.css.family === "string"
    && typeof value.css.style === "string"
    && typeof value.css.weight === "string";
}

/**
 * Reports whether an unknown value is a non-array object.
 *
 * @param value - Candidate value.
 * @returns Whether the value is record-shaped.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
