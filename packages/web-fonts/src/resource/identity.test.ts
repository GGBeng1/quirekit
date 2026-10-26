import { describe, expect, it } from "vitest";
import {
  createQuireWebFontAssetCacheKey,
  normalizeQuireWebFontFamily
} from "./identity";

describe("web-font resource identity", () => {
  it("normalizes family lookup without changing the manifest family", () => {
    expect(normalizeQuireWebFontFamily("  Noto   Sans SC  ")).toBe("noto sans sc");
  });

  it("keeps provider, version, descriptors, asset, and integrity in cache identity", () => {
    const first = createQuireWebFontAssetCacheKey({
      providerId: "google-fonts",
      family: "Noto Sans SC",
      version: "v39",
      faceId: "normal-400",
      assetId: "latin",
      style: "normal",
      weight: "400",
      sourceUrl: "https://fonts.example/noto.woff2",
      expectedIntegrity: "sha256-Zml4dHVyZQ=="
    });
    const nextVersion = createQuireWebFontAssetCacheKey({
      providerId: "google-fonts",
      family: "Noto Sans SC",
      version: "v40",
      faceId: "normal-400",
      assetId: "latin",
      style: "normal",
      weight: "400",
      sourceUrl: "https://fonts.example/noto.woff2",
      expectedIntegrity: "sha256-Zml4dHVyZQ=="
    });

    expect(first).not.toBe(nextVersion);
    expect(first).toContain("google-fonts");
  });
});
