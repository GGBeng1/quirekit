import { describe, expect, it, vi } from "vitest";
import { createQuireMemoryFontCache } from "@quirekit/web-fonts";
import type { ClassicEditorWebFontSource } from "../../../types";
import { createClassicEditorMemoryFontLibraryPersistence } from "../../web-fonts";
import { createClassicDocumentWebFontLibrary } from "./library";

const sourceFamily = {
  family: "Fixture Hub Serif",
  sourceId: "fixture",
  sourceLabel: "Fixture Fonts",
  license: { name: "Fixture license", url: "https://example.test/license" },
  category: "serif"
} as const;

describe("Classic document font Hub library", () => {
  it("exposes application-mounted families and persists a bounded recent list", () => {
    installFontFaceDouble();
    const persistence = createClassicEditorMemoryFontLibraryPersistence({
      sourceSettings: {},
      importedFamilies: [],
      recentFamilies: ["Existing Serif"]
    });
    const runtime = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(),
      probeLocalFamily: async () => false,
      onInstalled: vi.fn(),
      webFonts: {
        families: [],
        mountedFamilies: [{ family: "Noto Serif SC", displayName: "Noto 宋体" }],
        sources: [],
        catalogs: [],
        persistence
      }
    });

    expect(runtime.library.mountedFamilies).toEqual([
      { family: "Noto Serif SC", displayName: "Noto 宋体" }
    ]);
    expect(runtime.library.recentFamilies).toEqual(["Existing Serif"]);
    for (const family of ["A", "B", "C", "D", "E", "C"]) {
      runtime.library.rememberRecentFamily(family);
    }
    expect(runtime.library.recentFamilies).toEqual(["C", "E", "D", "B", "A"]);
    expect(persistence.load().recentFamilies).toEqual(["C", "E", "D", "B", "A"]);
    runtime.destroy();
  });

  it("previews a retained static-source font after its source was removed, including a cold byte cache", async () => {
    installFontFaceDouble();
    const snapshot = { url: "http://localhost:8080/fonts.css", name: "Private", enabledAt: 1,
      css: "@font-face { font-family: 'Private'; src: url('./font.woff2') format('woff2'); }" };
    const persistence = createClassicEditorMemoryFontLibraryPersistence();
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const first = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(), probeLocalFamily: async () => false, onInstalled: vi.fn(),
      webFonts: { families: [], sources: [], catalogs: [], cache: createQuireMemoryFontCache(), persistence, fetch: fetcher }
    });
    first.library.enableStylesheetSource!(snapshot);
    const family = (await first.library.search(`stylesheet:${snapshot.url}`, ""))[0]!;
    await first.library.importFamily(family, true);
    first.library.removeCustomSource!(`stylesheet:${snapshot.url}`);
    first.destroy();
    const second = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(), probeLocalFamily: async () => false, onInstalled: vi.fn(),
      webFonts: { families: [], sources: [], catalogs: [], cache: createQuireMemoryFontCache(), persistence, fetch: fetcher }
    });
    expect(second.library.sources).toHaveLength(0);
    await second.library.previewFamily(second.library.importedFamilies[0]!);
    expect(second.library.getStatus("Private").phase).toBe("installed");
    expect(fetcher).toHaveBeenCalledTimes(2);
    second.destroy();
  });

  it("searches, imports, persists, and remounts solely from cached bytes", async () => {
    installFontFaceDouble();
    const resolveFamily = vi.fn(async () => ({
      providerId: "fixture",
      family: sourceFamily.family,
      version: "1",
      license: sourceFamily.license,
      faces: [{
        id: "regular",
        weight: "400" as const,
        assets: [{
          id: "regular",
          sources: [{ url: "https://example.test/hub-serif.woff2", format: "woff2" as const }]
        }]
      }]
    }));
    const source: ClassicEditorWebFontSource = {
      id: "fixture",
      label: { "zh-CN": "测试字体", en: "Fixture Fonts" },
      settingFields: [],
      search: vi.fn(async () => [sourceFamily]),
      resolveFamily
    };
    const cache = createQuireMemoryFontCache();
    const persistence = createClassicEditorMemoryFontLibraryPersistence();
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      headers: { "cache-control": "public, max-age=3600" }
    }));
    const first = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(),
      webFonts: { families: [], sources: [source], catalogs: [], cache, persistence, fetch: fetcher },
      probeLocalFamily: async () => false,
      onInstalled: vi.fn()
    });

    const results = await first.library.search("fixture", "serif");
    await first.library.importFamily(results[0]!, true);

    expect(first.library.importedFamilies).toMatchObject([{ family: sourceFamily.family }]);
    expect(first.library.getInstallations()).toMatchObject([{
      family: sourceFamily.family,
      source: "download",
      assets: [expect.objectContaining({
        data: expect.any(ArrayBuffer)
      })]
    }]);
    expect(persistence.load().importedFamilies[0]?.manifest?.family).toBe(sourceFamily.family);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(resolveFamily).toHaveBeenCalledTimes(1);
    const secondInstalled = vi.fn();
    const second = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(),
      webFonts: { families: [], sources: [source], catalogs: [], cache, persistence, fetch: fetcher },
      probeLocalFamily: async () => false,
      onInstalled: secondInstalled
    });

    await vi.waitFor(() => expect(second.isInstalled(sourceFamily.family)).toBe(true));
    expect(second.library.getInstallations()).toMatchObject([{
      family: sourceFamily.family,
      source: "cache"
    }]);
    expect(secondInstalled).toHaveBeenCalledWith(sourceFamily.family);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(resolveFamily).toHaveBeenCalledTimes(1);
    first.destroy();
    second.destroy();
  });

  it("registers an on-demand preview without creating an imported record", async () => {
    installFontFaceDouble();
    const resolveFamily = vi.fn(async () => ({
      providerId: "fixture",
      family: sourceFamily.family,
      version: "1",
      license: sourceFamily.license,
      faces: [{
        id: "regular",
        assets: [{
          id: "regular",
          sources: [{ url: "https://example.test/preview.woff2", format: "woff2" as const }]
        }]
      }]
    }));
    const source: ClassicEditorWebFontSource = {
      id: "fixture",
      label: { "zh-CN": "测试字体", en: "Fixture Fonts" },
      settingFields: [],
      search: vi.fn(async () => [sourceFamily]),
      resolveFamily
    };
    const persistence = createClassicEditorMemoryFontLibraryPersistence();
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const runtime = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(),
      webFonts: {
        families: [],
        sources: [source],
        catalogs: [],
        cache: createQuireMemoryFontCache(),
        persistence,
        fetch: fetcher
      },
      probeLocalFamily: async () => false,
      onInstalled: vi.fn()
    });

    await runtime.library.previewFamily(sourceFamily);

    expect(runtime.library.importedFamilies).toEqual([]);
    expect(persistence.load().importedFamilies).toEqual([]);
    expect(runtime.library.getStatus(sourceFamily.family).phase).toBe("installed");
    expect(fetcher).toHaveBeenCalledTimes(1);

    await runtime.library.importFamily(sourceFamily, true);
    expect(runtime.library.importedFamilies).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(runtime.library.getInstallations()).toHaveLength(1);
    await runtime.library.removeFamily(sourceFamily);
    expect(runtime.library.getInstallations()).toEqual([]);
    runtime.destroy();
  });

  it("rolls back the imported record when downloaded bytes cannot be registered", async () => {
    vi.stubGlobal("FontFace", class {
      /** @param _family - Registered family. @param _source - Rejected bytes. */
      constructor(_family: string, _source: string | ArrayBuffer) {}

      /** @returns Rejection matching the browser FontFace contract. */
      async load(): Promise<FontFace> {
        throw new Error("Invalid font data in ArrayBuffer.");
      }
    });
    const source: ClassicEditorWebFontSource = {
      id: "fixture",
      label: { "zh-CN": "测试字体", en: "Fixture Fonts" },
      settingFields: [],
      search: vi.fn(async () => [sourceFamily]),
      resolveFamily: vi.fn(async () => ({
        providerId: "fixture",
        family: sourceFamily.family,
        version: "1",
        license: sourceFamily.license,
        faces: [{
          id: "regular",
          assets: [{
            id: "regular",
            sources: [{ url: "https://example.test/rejected.woff2", format: "woff2" as const }]
          }]
        }]
      }))
    };
    const persistence = createClassicEditorMemoryFontLibraryPersistence();
    const runtime = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(),
      webFonts: {
        families: [],
        sources: [source],
        catalogs: [],
        cache: createQuireMemoryFontCache(),
        persistence,
        fetch: vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
      },
      probeLocalFamily: async () => false,
      onInstalled: vi.fn()
    });

    await expect(runtime.library.importFamily(sourceFamily, true)).rejects.toThrow(
      'Browser rejected font bytes for "Fixture Hub Serif"'
    );

    expect(runtime.library.importedFamilies).toEqual([]);
    expect(persistence.load().importedFamilies).toEqual([]);
    runtime.destroy();
  });

  it("enables validated declarative sources and restores them without remote code", async () => {
    const descriptor = {
      specVersion: "quirekit-font-source/v1",
      id: "org.example.fonts",
      name: { default: "Example Fonts", translations: { "zh-CN": "示例字体" } },
      catalogUrl: "https://fonts.example/catalog",
      resolveUrl: "https://fonts.example/resolve",
      capabilities: ["browse", "resolve"],
      authentication: { type: "none" }
    };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(descriptor), {
      headers: { "content-type": "application/json" }
    }));
    const persistence = createClassicEditorMemoryFontLibraryPersistence();
    const first = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(),
      webFonts: { families: [], sources: [], catalogs: [], persistence, fetch: fetcher },
      probeLocalFamily: async () => false,
      onInstalled: vi.fn()
    });

    const record = await first.library.inspectCustomSource?.(
      "https://fonts.example/source.json"
    );
    if (record === undefined) throw new Error("Custom source inspection is unavailable.");
    first.library.enableCustomSource?.(record);

    expect(first.library.sources).toMatchObject([{
      id: "org.example.fonts",
      kind: "custom"
    }]);
    expect(persistence.load().customSources).toHaveLength(1);

    const second = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(),
      webFonts: { families: [], sources: [], catalogs: [], persistence, fetch: fetcher },
      probeLocalFamily: async () => false,
      onInstalled: vi.fn()
    });
    expect(second.library.sources.map((source) => source.id)).toEqual(["org.example.fonts"]);
    second.library.removeCustomSource?.("org.example.fonts");
    expect(second.library.sources).toEqual([]);
    expect(persistence.load().customSources).toEqual([]);
    first.destroy();
    second.destroy();
  });

  it("keeps same-name imports from different sources as separate records", async () => {
    const firstFamily = { ...sourceFamily, familyId: "shared-a", sourceId: "source-a" };
    const secondFamily = { ...sourceFamily, familyId: "shared-b", sourceId: "source-b" };
    const sources = [firstFamily, secondFamily].map((family) => ({
      id: family.sourceId,
      label: { "zh-CN": family.sourceId, en: family.sourceId },
      settingFields: [],
      search: async () => [family],
      resolveFamily: async () => {
        throw new Error("No download expected in this test.");
      }
    } satisfies ClassicEditorWebFontSource));
    const runtime = createClassicDocumentWebFontLibrary({
      ownerDocument: createOwnerDocument(),
      webFonts: { families: [], sources, catalogs: [] },
      probeLocalFamily: async () => false,
      onInstalled: vi.fn()
    });

    await runtime.library.importFamily(firstFamily, false);
    await runtime.library.importFamily(secondFamily, false);
    expect(runtime.library.importedFamilies).toHaveLength(2);

    await runtime.library.removeFamily(firstFamily);
    expect(runtime.library.importedFamilies).toMatchObject([{
      sourceId: "source-b",
      familyId: "shared-b"
    }]);
    runtime.destroy();
  });
});

/** Installs a deterministic byte-backed FontFace test double. */
function installFontFaceDouble(): void {
  vi.stubGlobal("FontFace", class {
    /** @param _family - Registered family. @param _source - Cached bytes. */
    constructor(_family: string, _source: string | ArrayBuffer) {}

    /** @returns Loaded fake face. */
    async load(): Promise<FontFace> {
      return this as unknown as FontFace;
    }
  });
}

/** @returns Minimal document realm with mutable font registrations. */
function createOwnerDocument(): Document {
  return {
    fonts: {
      add: vi.fn(),
      delete: vi.fn(() => true),
      load: vi.fn(async () => [] as FontFace[]),
      ready: Promise.resolve({} as FontFaceSet)
    }
  } as unknown as Document;
}
