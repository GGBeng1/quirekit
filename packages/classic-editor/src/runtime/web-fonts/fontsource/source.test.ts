import { describe, expect, it, vi } from "vitest";
import { createClassicFontsourceSource } from "./source";

const directory = [
  createDirectoryItem("noto-sans-sc", "Noto Sans SC", "chinese-simplified"),
  createDirectoryItem("roboto", "Roboto", "latin")
];

describe("Classic Fontsource source", () => {
  it("resolves dormant recommendations and retains numbered Chinese shards with Latin defaults", async () => {
    const details = {
      ...createDetails(), defSubset: "latin",
      unicodeRange: { "[4]": "U+4E00-9FFF", latin: "U+0000-00FF" },
      variants: { 400: { normal: {
        "4": { url: { woff2: assetUrl("4", 400) } },
        latin: { url: { woff2: assetUrl("latin", 400) } }
      } } }
    };
    const source = createClassicFontsourceSource({ fetch: vi.fn(async () => jsonResponse(details)) });
    const manifest = await source.resolveFamily({ settings: {}, family: {
      family: "Noto Sans SC", familyId: "noto-sans-sc", sourceId: "fontsource", sourceLabel: "Fontsource",
      license: { name: "OFL", url: "https://example.test/license" }
    } });
    expect(manifest.faces[0]?.assets).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "4-400-normal", unicodeRange: "U+4E00-9FFF" }),
      expect.objectContaining({ id: "latin-400-normal", unicodeRange: "U+0000-00FF" })
    ]));
  });
  it("browses the complete keyless directory with bounded cursors", async () => {
    const fetcher = vi.fn(async () => jsonResponse(directory));
    const source = createClassicFontsourceSource({ fetch: fetcher });

    const first = await source.browse?.({ query: "", settings: {}, limit: 1 });
    const second = await source.browse?.({
      query: "",
      settings: {},
      limit: 1,
      cursor: first?.nextCursor
    });

    expect(first).toMatchObject({
      total: 2,
      items: [{ familyId: "noto-sans-sc", family: "Noto Sans SC" }]
    });
    expect(second?.items).toMatchObject([{ familyId: "roboto", family: "Roboto" }]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("searches Chinese aliases and pins resolved assets to an exact package version", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.endsWith("/noto-sans-sc")) return jsonResponse(createDetails());
      return jsonResponse(directory);
    });
    const source = createClassicFontsourceSource({ fetch: fetcher });
    const [family] = await source.search({ query: "黑体", settings: {} });
    if (family === undefined) throw new Error("Expected Fontsource search result.");

    const manifest = await source.resolveFamily({ family, settings: {} });

    expect(family).toMatchObject({
      familyId: "noto-sans-sc",
      version: "2026-06-01",
      sourceId: "fontsource"
    });
    expect(manifest).toMatchObject({
      providerId: "fontsource",
      familyId: "noto-sans-sc",
      version: "5.2.10",
      family: "Noto Sans SC"
    });
    expect(manifest.faces.flatMap((face) => face.assets).map(
      (asset) => asset.sources[0]?.url
    )).toEqual(expect.arrayContaining([
      "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@5.2.10/chinese-simplified-400-normal.woff2"
    ]));
  });

  it("filters subset metadata before calculating page totals", async () => {
    const source = createClassicFontsourceSource({
      fetch: vi.fn(async () => jsonResponse(directory))
    });

    const chinese = await source.browse?.({
      query: "",
      subsets: ["chinese-simplified"],
      settings: {},
      limit: 24
    });
    const unsupported = await source.browse?.({
      query: "",
      subsets: ["cyrillic"],
      settings: {},
      limit: 24
    });

    expect(chinese).toMatchObject({
      total: 1,
      items: [{ family: "Noto Sans SC" }]
    });
    expect(unsupported).toMatchObject({ total: 0, items: [] });
  });
});

/** Creates one minimal Fontsource directory fixture. */
function createDirectoryItem(id: string, family: string, defSubset: string) {
  return {
    id,
    family,
    subsets: [...new Set([defSubset, "latin"])],
    weights: [400, 700],
    styles: ["normal"],
    defSubset,
    lastModified: "2026-06-01",
    category: "sans-serif",
    license: "OFL-1.1",
    type: "google"
  };
}

/** Creates one exact Fontsource family-details fixture. */
function createDetails() {
  return {
    ...directory[0],
    npmVersion: "5.2.10",
    unicodeRange: {
      "chinese-simplified": "U+4E00-9FFF",
      latin: "U+0000-00FF"
    },
    variants: {
      400: {
        normal: {
          "chinese-simplified": { url: { woff2: assetUrl("chinese-simplified", 400) } },
          latin: { url: { woff2: assetUrl("latin", 400) } }
        }
      },
      700: {
        normal: {
          "chinese-simplified": { url: { woff2: assetUrl("chinese-simplified", 700) } },
          latin: { url: { woff2: assetUrl("latin", 700) } }
        }
      }
    }
  };
}

/** Creates one moving Fontsource CDN fixture URL. */
function assetUrl(subset: string, weight: number): string {
  return `https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@latest/${subset}-${weight}-normal.woff2`;
}

/** Creates one JSON response accepted by the provider adapter. */
function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" }
  });
}
