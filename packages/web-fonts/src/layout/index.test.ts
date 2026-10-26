import { describe, expect, it } from "vitest";
import type { QuireWebFontInstallation } from "../types";
import { toQuireFontServiceSources } from "./index";

describe("web font Layout adapter", () => {
  it("maps only assets explicitly declared safe for shaping", () => {
    const sources = toQuireFontServiceSources(installation);

    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      family: "Fixture Serif",
      genericFamily: "serif",
      style: "normal",
      weight: "400",
      faceIndex: 2
    });
  });
});

const shapingAsset = {
  id: "full",
  sources: [{ url: "https://example.test/full.woff2" }],
  shaping: true,
  faceIndex: 2
} as const;
const browserOnlyAsset = {
  id: "shard",
  sources: [{ url: "https://example.test/shard.woff2" }],
  unicodeRange: "U+4E00-9FFF",
  shaping: false
} as const;
const face = {
  id: "regular",
  style: "normal",
  weight: "400",
  assets: [shapingAsset, browserOnlyAsset]
} as const;
const manifest = {
  providerId: "fixture",
  family: "Fixture Serif",
  version: "1",
  license: { name: "Fixture", url: "https://example.test/license" },
  genericFamily: "serif",
  faces: [face]
} as const;
const installation: QuireWebFontInstallation = {
  family: manifest.family,
  providerId: manifest.providerId,
  source: "download",
  persistent: false,
  manifest,
  assets: [shapingAsset, browserOnlyAsset].map((asset) => ({
    face,
    asset,
    data: new ArrayBuffer(4),
    digest: "sha256-fixture",
    sourceUrl: asset.sources[0].url,
    fromCache: false,
    persistent: false
  }))
};
