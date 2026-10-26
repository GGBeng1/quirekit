import {
  normalizeQuireWebFontFamily,
  parseWebFontCss,
  type QuireWebFontFace,
  type QuireWebFontFamilyManifest
} from "@quirekit/web-fonts";
import type { ClassicEditorWebFontSource } from "../../../types";
import {
  matchesChineseWebFont,
  parseChineseWebFontsDirectory,
  toClassicChineseWebFontFamily,
  type ChineseWebFontsDirectoryFamily
} from "./directory";
import {
  createChineseWebFontsStylesheetUrls,
  fetchChineseWebFontsJson,
  fetchChineseWebFontsStylesheet,
  resolveChineseWebFontsPackageVersion
} from "./network";
import { matchesClassicWebFontSubsets } from "../subset-filter";

const SOURCE_ID = "chinese-web-fonts";
const SOURCE_LABEL = "中文网字计划";
const DIRECTORY_URL = new URL(
  "https://cdn.jsdelivr.net/gh/KonghaYao/chinese-free-web-font-storage@branch/index.json"
);

/** Options used to create Classic's Chinese Web Fonts source adapter. */
export interface CreateClassicChineseWebFontsSourceOptions {
  /** Optional fetch boundary used by directory, version, and CSS requests. */
  readonly fetch?: typeof globalThis.fetch | undefined;
}

/**
 * Creates the built-in, keyless Chinese Web Fonts directory source.
 *
 * @param options - Optional fetch boundary.
 * @returns Searchable source backed by versioned public npm CSS packages.
 */
export function createClassicChineseWebFontsSource(
  options: CreateClassicChineseWebFontsSourceOptions = {}
): ClassicEditorWebFontSource {
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  let directoryRequest: Promise<readonly ChineseWebFontsDirectoryFamily[]> | undefined;
  const versionRequests = new Map<string, Promise<string>>();
  const resolutions = new Map<string, Promise<QuireWebFontFamilyManifest>>();

  /** Loads and validates the provider directory once per source instance. */
  function loadDirectory(): Promise<readonly ChineseWebFontsDirectoryFamily[]> {
    directoryRequest ??= fetchChineseWebFontsJson(DIRECTORY_URL, fetcher)
      .then(parseChineseWebFontsDirectory)
      .catch((error: unknown) => {
        directoryRequest = undefined;
        throw error;
      });
    return directoryRequest;
  }

  return {
    id: SOURCE_ID,
    label: { "zh-CN": SOURCE_LABEL, en: "Chinese Web Fonts" },
    description: { "zh-CN": "中文字体 · 思源宋体、霞鹜文楷等 · 无需密钥", en: "Chinese families including Source Han Serif and LXGW WenKai · No API key" },
    settingFields: [],
    /** @inheritdoc */
    async search({ query, subsets }) {
      const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
      return (await loadDirectory())
        .filter((entry) => (
          matchesChineseWebFont(entry, normalizedQuery)
          && matchesClassicWebFontSubsets(["cjk"], subsets)
        ))
        .map(toClassicChineseWebFontFamily);
    },
    /** @inheritdoc */
    async resolveFamily({ family }) {
      const key = normalizeQuireWebFontFamily(family.family);
      let resolution = resolutions.get(key);
      if (resolution === undefined) {
        resolution = loadDirectory().then(async (directory) => {
          const entry = directory.find((candidate) => (
            normalizeQuireWebFontFamily(candidate.family) === key
          ));
          if (entry === undefined) {
            throw new Error(`${SOURCE_LABEL}中不存在字体“${family.family}”。`);
          }
          return resolveDirectoryFamily(entry, family.license, fetcher, versionRequests);
        }).catch((error: unknown) => {
          resolutions.delete(key);
          throw error;
        });
        resolutions.set(key, resolution);
      }
      return resolution;
    }
  };
}

/**
 * Resolves versioned CSS shards for one explicitly imported family.
 *
 * @param entry - Directory family selected by the user.
 * @param license - Notice already disclosed in the Hub.
 * @param fetcher - Provider fetch boundary.
 * @param versionRequests - Per-package latest-version cache.
 * @returns Atomic installable family manifest.
 */
async function resolveDirectoryFamily(
  entry: ChineseWebFontsDirectoryFamily,
  license: QuireWebFontFamilyManifest["license"],
  fetcher: typeof globalThis.fetch,
  versionRequests: Map<string, Promise<string>>
): Promise<QuireWebFontFamilyManifest> {
  const version = await resolveChineseWebFontsPackageVersion(
    entry.packageId,
    fetcher,
    versionRequests
  );
  // Provider indexes can temporarily drift from their published npm package.
  // Resolve shards independently so one stale optional weight cannot suppress
  // a usable regular face; the family still fails when every shard is invalid.
  const faceResults = await Promise.allSettled(entry.remotePaths.map(async (remotePath) => {
    const stylesheetUrls = createChineseWebFontsStylesheetUrls(
      entry.packageId,
      version,
      remotePath
    );
    const stylesheet = await fetchChineseWebFontsStylesheet(stylesheetUrls, fetcher);
    return parseWebFontCss(stylesheet.css, {
      requestedFamily: entry.family,
      providerLabel: SOURCE_LABEL,
      stylesheetUrl: stylesheet.url
    }).faces;
  }));
  const faces = faceResults.flatMap((result) => (
    result.status === "fulfilled" ? result.value : []
  ));
  if (faces.length === 0) {
    const firstFailure = faceResults.find((result) => result.status === "rejected");
    throw new Error(
      `${SOURCE_LABEL}没有为字体“${entry.displayName}”提供可用的已发布样式。`,
      firstFailure === undefined ? undefined : { cause: firstFailure.reason }
    );
  }
  const genericFamily = resolveGenericFamily(entry.category);
  return {
    providerId: SOURCE_ID,
    family: entry.family,
    version,
    license,
    ...(genericFamily === undefined ? {} : { genericFamily }),
    faces: mergeDistinctFaces(faces)
  };
}

/**
 * Maps product categories onto valid CSS generic families.
 *
 * @param category - Source-neutral Hub category.
 * @returns CSS generic family or undefined for decorative faces.
 */
function resolveGenericFamily(category: string): string | undefined {
  if (category === "serif" || category === "sans-serif" || category === "monospace") {
    return category;
  }
  return category === "handwriting" ? "cursive" : undefined;
}

/**
 * Merges faces with distinct descriptor ids while preserving directory order.
 *
 * @param faces - Faces parsed from one or more provider stylesheets.
 * @returns Descriptor-distinct faces.
 */
function mergeDistinctFaces(faces: readonly QuireWebFontFace[]): readonly QuireWebFontFace[] {
  return [...new Map(faces.map((face) => [face.id, face])).values()];
}
