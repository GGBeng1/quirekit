import type {
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontSource
} from "../../../types";
import { createFontsourceLicense, createFontsourceManifest } from "./manifest";
import {
  fetchFontsourceDirectory,
  fetchFontsourceFamilyDetails
} from "./network";
import type { FontsourceDirectoryItem } from "./types";
import { matchesClassicWebFontSubsets } from "../subset-filter";

const SOURCE_ID = "fontsource";
const CATEGORY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  serif: ["宋体", "衬线"],
  "sans-serif": ["黑体", "无衬线"],
  display: ["标题", "展示"],
  handwriting: ["手写", "楷体"],
  monospace: ["等宽"]
};

/** Options used to create Classic's built-in Fontsource adapter. */
export interface CreateClassicFontsourceSourceOptions {
  /** Optional metadata fetch boundary. */
  readonly fetch?: typeof globalThis.fetch | undefined;
}

/**
 * Creates the keyless public Fontsource catalog and exact-asset resolver.
 *
 * @param options - Optional metadata fetch boundary.
 * @returns Built-in paged source adapter.
 */
export function createClassicFontsourceSource(
  options: CreateClassicFontsourceSourceOptions = {}
): ClassicEditorWebFontSource {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  let directoryRequest: Promise<readonly FontsourceDirectoryItem[]> | undefined;

  /**
   * Loads and reuses the provider directory until a failed request.
   *
   * @returns Shared directory request.
   */
  function loadDirectory(): Promise<readonly FontsourceDirectoryItem[]> {
    directoryRequest ??= fetchFontsourceDirectory(fetcher).catch((error: unknown) => {
      directoryRequest = undefined;
      throw error;
    });
    return directoryRequest;
  }

  /**
   * Filters the complete directory before source-local cursor paging.
   *
   * @param query - User-entered family query.
   * @param subsets - Optional accepted provider subset tokens.
   * @returns Matching source-neutral family rows.
   */
  async function searchDirectory(
    query: string,
    subsets?: readonly string[]
  ): Promise<readonly ClassicEditorWebFontFamily[]> {
    const normalized = query.trim().toLocaleLowerCase("en-US");
    return (await loadDirectory())
      .filter((item) => (
        matchesFontsourceItem(item, normalized)
        && matchesClassicWebFontSubsets(item.subsets, subsets)
      ))
      .map(toClassicFamily);
  }

  return {
    id: SOURCE_ID,
    label: { "zh-CN": "Fontsource", en: "Fontsource" },
    description: { "zh-CN": "开源字体 · Noto、Source、常用西文字体 · 无需密钥", en: "Open fonts including Noto, Source and office families · No API key" },
    kind: "built-in",
    homepageUrl: "https://fontsource.org/",
    settingFields: [],
    /** @inheritdoc */
    async search({ query, subsets }) {
      return searchDirectory(query, subsets);
    },
    /** @inheritdoc */
    async browse({ query, limit, cursor, subsets }) {
      const matches = await searchDirectory(query, subsets);
      const offset = parseCursor(cursor, matches.length);
      const end = Math.min(matches.length, offset + limit);
      return {
        items: matches.slice(offset, end),
        total: matches.length,
        ...(end < matches.length ? { nextCursor: String(end) } : {})
      };
    },
    /** @inheritdoc */
    async resolveFamily({ family }) {
      const familyId = family.familyId?.trim();
      const revision = family.version?.trim();
      if (!familyId) {
        throw new Error(`Fontsource family "${family.family}" has no exact catalog identity.`);
      }
      const details = await fetchFontsourceFamilyDetails(familyId, fetcher);
      // Dormant curated disclosures resolve current metadata on explicit use;
      // directory selections retain their revision guard and assets remain pinned.
      if (details.family !== family.family || (revision && details.lastModified !== revision)) {
        throw new Error(`Fontsource family "${family.family}" changed; refresh the catalog.`);
      }
      return createFontsourceManifest(details);
    }
  };
}

/**
 * Maps one directory row into source-neutral Classic metadata.
 *
 * @param item - Valid provider directory row.
 * @returns Source-neutral Classic family metadata.
 */
function toClassicFamily(item: FontsourceDirectoryItem): ClassicEditorWebFontFamily {
  return {
    familyId: item.id,
    family: item.family,
    version: item.lastModified,
    sourceId: SOURCE_ID,
    sourceLabel: "Fontsource",
    license: createFontsourceLicense(item.license),
    category: item.category,
    subsets: item.subsets,
    variants: [
      ...item.weights.map(String),
      ...item.styles.filter((style) => style !== "normal")
    ]
  };
}

/**
 * Matches names, ids, categories, scripts, licenses, and common Chinese aliases.
 *
 * @param item - Valid provider directory row.
 * @param query - Normalized query.
 * @returns Whether the row matches the query.
 */
function matchesFontsourceItem(item: FontsourceDirectoryItem, query: string): boolean {
  if (query.length === 0) return true;
  const terms = [
    item.id,
    item.family,
    item.category,
    item.license,
    ...item.subsets,
    ...(CATEGORY_ALIASES[item.category] ?? [])
  ];
  return terms.some((term) => term.toLocaleLowerCase("en-US").includes(query));
}

/**
 * Parses a source-local bounded offset cursor.
 *
 * @param cursor - Optional provider cursor.
 * @param total - Complete filtered result count.
 * @returns Safe zero-based result offset.
 */
function parseCursor(cursor: string | undefined, total: number): number {
  if (cursor === undefined) return 0;
  const value = Number(cursor);
  if (!Number.isSafeInteger(value) || value < 0 || value > total) {
    throw new RangeError("Invalid Fontsource cursor.");
  }
  return value;
}
