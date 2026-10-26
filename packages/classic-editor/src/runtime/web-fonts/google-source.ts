import { createGoogleFontsCssCatalog } from "@quirekit/web-fonts";
import type {
  ClassicEditorWebFontFamily,
  ClassicEditorWebFontSource
} from "../../types";
import { matchesClassicWebFontSubsets } from "./subset-filter";

const GOOGLE_SOURCE_ID = "google-fonts";
const GOOGLE_DIRECTORY_URL = "https://www.googleapis.com/webfonts/v1/webfonts";
const CATEGORY_SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  serif: ["serif", "宋", "宋体", "衬线"],
  "sans-serif": ["sans", "sans serif", "sans-serif", "黑", "黑体", "无衬线"],
  display: ["display", "标题", "展示", "艺术"],
  handwriting: ["handwriting", "手写", "楷", "楷体", "书法"],
  monospace: ["monospace", "mono", "等宽"]
};
const SUBSET_SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "chinese-simplified": ["中文", "简体", "简体中文"],
  "chinese-traditional": ["中文", "繁体", "繁体中文"],
  cyrillic: ["西里尔"],
  japanese: ["日文", "日语"],
  korean: ["韩文", "韩语"],
  latin: ["拉丁"],
  vietnamese: ["越南文", "越南语"]
};
const FAMILY_SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "ma shan zheng": ["马善政", "毛笔楷书"],
  "noto sans sc": ["思源黑体", "黑体"],
  "noto serif sc": ["思源宋体", "宋体"],
  "zcool kuaile": ["站酷快乐体"],
  "zcool qingke huangyou": ["站酷庆科黄油体"],
  "zcool xiaowei": ["站酷小薇体"]
};

/** Options used to create Classic's official Google Fonts source adapter. */
export interface CreateClassicGoogleFontsSourceOptions {
  /** Optional fetch boundary used by catalog search and CSS resolution. */
  readonly fetch?: typeof globalThis.fetch | undefined;
}

/** Shape consumed from the official Google Fonts Developer API. */
interface GoogleFontsDirectoryItem {
  /** Exact family name. */
  readonly family: string;
  /** Provider category. */
  readonly category?: string | undefined;
  /** Available variant labels. */
  readonly variants?: readonly string[] | undefined;
  /** Supported subset labels. */
  readonly subsets?: readonly string[] | undefined;
}

/**
 * Creates the built-in searchable Google Fonts source.
 *
 * @param options - Optional fetch boundary.
 * @returns Source requiring a host/user Developer API key for full search.
 */
export function createClassicGoogleFontsSource(
  options: CreateClassicGoogleFontsSourceOptions = {}
): ClassicEditorWebFontSource {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  const directoryRequests = new Map<string, Promise<readonly GoogleFontsDirectoryItem[]>>();
  const familyCatalogs = new Map<string, ReturnType<typeof createGoogleFontsCssCatalog>>();

  return {
    id: GOOGLE_SOURCE_ID,
    label: { "zh-CN": "Google Fonts", en: "Google Fonts" },
    description: { "zh-CN": "Google 官方目录 · 浏览目录需配置 API 密钥", en: "Google's official catalog · Directory browsing requires an API key" },
    settingFields: [{
      key: "apiKey",
      label: { "zh-CN": "Developer API Key", en: "Developer API key" },
      placeholder: {
        "zh-CN": "保存在当前浏览器，不写入文档",
        en: "Stored in this browser, never in the document"
      },
      required: true,
      secret: true
    }],
    /** @inheritdoc */
    async search({ query, settings, subsets }): Promise<readonly ClassicEditorWebFontFamily[]> {
      const apiKey = settings.apiKey?.trim();
      if (!apiKey) {
        throw new Error("Google Fonts Developer API key is required for catalog search.");
      }
      let request = directoryRequests.get(apiKey);
      if (request === undefined) {
        request = fetchGoogleFontsDirectory(apiKey, fetcher).catch((error: unknown) => {
          directoryRequests.delete(apiKey);
          throw error;
        });
        directoryRequests.set(apiKey, request);
      }
      const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
      return (await request)
        .filter((item) => (
          matchesDirectoryItem(item, normalizedQuery)
          && matchesClassicWebFontSubsets(item.subsets, subsets)
        ))
        .map(toClassicFamily);
    },
    /** @inheritdoc */
    async resolveFamily({ family }) {
      const key = family.family.trim().toLocaleLowerCase("en-US");
      let catalog = familyCatalogs.get(key);
      if (catalog === undefined) {
        const variants = new Set(family.variants ?? []);
        catalog = createGoogleFontsCssCatalog({
          fetch: fetcher,
          families: [{
            family: family.family,
            weights: variants.has("700") ? [400, 700] : [400],
            styles: variants.has("italic") ? ["normal", "italic"] : ["normal"],
            license: family.license
          }]
        });
        familyCatalogs.set(key, catalog);
      }
      const manifest = await catalog.resolveFamily(family.family);
      if (manifest === null) {
        throw new Error(`Google Fonts did not resolve imported family "${family.family}".`);
      }
      return manifest;
    }
  };
}

/**
 * Matches provider family names plus product-local category, subset, and
 * well-known Chinese aliases without changing provider metadata.
 *
 * @param item - One validated Google Fonts directory item.
 * @param normalizedQuery - Trimmed lowercase user query.
 * @returns Whether the item belongs in the local search result.
 */
function matchesDirectoryItem(
  item: GoogleFontsDirectoryItem,
  normalizedQuery: string
): boolean {
  if (normalizedQuery.length === 0) return true;
  const normalizedFamily = item.family.toLocaleLowerCase("en-US");
  if (normalizedFamily.includes(normalizedQuery)) return true;
  const terms = [
    ...(CATEGORY_SEARCH_ALIASES[item.category ?? ""] ?? []),
    ...(item.subsets ?? []).flatMap((subset) => (
      SUBSET_SEARCH_ALIASES[subset] ?? [subset]
    )),
    ...(FAMILY_SEARCH_ALIASES[normalizedFamily] ?? [])
  ].map((term) => term.toLocaleLowerCase("en-US"));
  return terms.some((term) => term.startsWith(normalizedQuery));
}

/**
 * Fetches the official Google Fonts metadata directory once per API key.
 *
 * @param apiKey - User/host supplied Developer API key.
 * @param fetcher - Search fetch boundary.
 * @returns Valid family metadata rows.
 */
async function fetchGoogleFontsDirectory(
  apiKey: string,
  fetcher: typeof globalThis.fetch
): Promise<readonly GoogleFontsDirectoryItem[]> {
  const url = new URL(GOOGLE_DIRECTORY_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("sort", "popularity");
  url.searchParams.append("capability", "WOFF2");
  const response = await fetcher(url, { mode: "cors", credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Google Fonts catalog request failed with HTTP ${response.status}.`);
  }
  const body = await response.json() as { readonly items?: readonly unknown[] | undefined };
  return (body.items ?? []).filter(isDirectoryItem);
}

/**
 * Converts provider metadata into Classic's source-neutral search record.
 *
 * @param item - Valid Google directory item.
 * @returns Product-facing family metadata.
 */
function toClassicFamily(item: GoogleFontsDirectoryItem): ClassicEditorWebFontFamily {
  const slug = item.family.trim().replace(/\s+/g, "+");
  return {
    family: item.family,
    sourceId: GOOGLE_SOURCE_ID,
    sourceLabel: "Google Fonts",
    license: {
      name: "Google Fonts license information",
      url: `https://fonts.google.com/specimen/${encodeURIComponent(slug).replace(/%2B/g, "+")}/about`
    },
    ...(item.category === undefined ? {} : { category: item.category }),
    ...(item.subsets === undefined ? {} : { subsets: [...item.subsets] }),
    ...(item.variants === undefined ? {} : { variants: [...item.variants] })
  };
}

/**
 * Reports whether an unknown Developer API row has a usable family.
 *
 * @param value - Candidate response item.
 * @returns Whether the item is safe to expose.
 */
function isDirectoryItem(value: unknown): value is GoogleFontsDirectoryItem {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.family === "string" && item.family.trim().length > 0
    && (item.category === undefined || typeof item.category === "string")
    && isOptionalStringArray(item.variants)
    && isOptionalStringArray(item.subsets);
}

/**
 * Reports whether a value is omitted or an array of strings.
 *
 * @param value - Candidate array.
 * @returns Whether the value matches the directory contract.
 */
function isOptionalStringArray(value: unknown): value is readonly string[] | undefined {
  return value === undefined
    || (Array.isArray(value) && value.every((entry) => typeof entry === "string"));
}
