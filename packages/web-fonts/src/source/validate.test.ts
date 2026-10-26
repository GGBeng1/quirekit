import { describe, expect, it } from "vitest";
import {
  parseQuireFontSourceCatalogPage,
  parseQuireFontSourceDescriptor,
  parseQuireRemoteFontFamilyManifest
} from "./validation";

const descriptor = parseQuireFontSourceDescriptor({
  specVersion: "quirekit-font-source/v1",
  id: "org.example.fonts",
  name: { default: "Example Fonts", translations: { "zh-CN": "示例字体" } },
  catalogUrl: "./catalog",
  resolveUrl: "./resolve",
  capabilities: ["browse", "search", "cursor-pagination", "resolve"],
  authentication: { type: "none" }
}, "https://fonts.example.test/source.json");

describe("declarative font source validation", () => {
  it("resolves safe descriptor endpoints and bounded catalog metadata", () => {
    expect(descriptor.catalogUrl).toBe("https://fonts.example.test/catalog");
    expect(parseQuireFontSourceCatalogPage({
      items: [{
        familyId: "serif",
        family: "Example Serif",
        version: "1.2.0",
        license: { name: "OFL-1.1", url: "https://example.test/license" },
        weights: ["400", "700"]
      }],
      total: 1
    }, 20)).toMatchObject({ total: 1, items: [{ familyId: "serif" }] });
  });

  it("rejects unsafe identities, floating versions, and oversized pages", () => {
    expect(() => parseQuireFontSourceDescriptor({
      specVersion: "quirekit-font-source/v1",
      id: "example",
      name: { default: "Bad" },
      catalogUrl: "http://example.test/catalog",
      resolveUrl: "https://example.test/resolve",
      capabilities: ["browse", "resolve"],
      authentication: { type: "none" }
    }, "https://example.test/source.json")).toThrow(/reverse-DNS/u);
    expect(() => parseQuireFontSourceCatalogPage({
      items: [{
        familyId: "bad",
        family: "Bad",
        version: "latest",
        license: { name: "OFL", url: "https://example.test/license" }
      }]
    }, 20)).toThrow(/exact/u);
    expect(() => parseQuireFontSourceCatalogPage({ items: [{}, {}] }, 1))
      .toThrow(/at most 1/u);
  });

  it("requires immutable remote assets with integrity and declared size", () => {
    const manifest = {
      providerId: descriptor.id,
      familyId: "serif",
      family: "Example Serif",
      version: "1.2.0",
      license: { name: "OFL", url: "https://example.test/license" },
      faces: [{
        id: "regular",
        weight: "400",
        assets: [{
          id: "latin",
          sizeBytes: 3,
          integrity: "sha256-AQID",
          sources: [{ url: "https://fonts.example.test/serif.woff2", format: "woff2" }]
        }]
      }]
    };
    expect(parseQuireRemoteFontFamilyManifest(
      manifest,
      descriptor,
      "serif",
      "1.2.0"
    )).toMatchObject({ familyId: "serif", faces: [{ assets: [{ sizeBytes: 3 }] }] });
    expect(() => parseQuireRemoteFontFamilyManifest({
      ...manifest,
      faces: [{ id: "regular", assets: [{ id: "latin", sources: [] }] }]
    }, descriptor, "serif", "1.2.0")).toThrow();
  });
});
