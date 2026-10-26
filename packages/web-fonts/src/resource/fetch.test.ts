import { describe, expect, it, vi } from "vitest";
import { createQuireMemoryFontCache } from "../cache";
import type { QuireWebFontFamilyManifest } from "../types";
import { createAssetKey, readQuireCachedWebFontAssets } from "./cache";
import { downloadQuireWebFontManifest } from "./fetch";

describe("web font resource download", () => {
  it("falls through equivalent mirrors and restores response-cacheable bytes", async () => {
    const cache = createQuireMemoryFontCache();
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      if (String(input).includes("first")) return new Response(null, { status: 503 });
      expect(init).toMatchObject({ mode: "cors", credentials: "omit", redirect: "follow" });
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "cache-control": "public, max-age=60" }
      });
    });

    const installed = await downloadQuireWebFontManifest(manifest, {
      fetch: fetcher,
      cache,
      maxAssetBytes: 10,
      maxConcurrentAssets: 2,
      now: () => 1_000
    });
    const restored = await readQuireCachedWebFontAssets(cache, manifest, 1_001);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(installed[0]).toMatchObject({ sourceUrl: "https://example.test/second.woff2" });
    expect(restored?.[0]).toMatchObject({ fromCache: true });
  });

  it("rejects an oversized response without caching it", async () => {
    const cache = createQuireMemoryFontCache();
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-length": "100", "cache-control": "max-age=60" }
    }));

    await expect(downloadQuireWebFontManifest(manifest, {
      fetch: fetcher,
      cache,
      maxAssetBytes: 10,
      maxConcurrentAssets: 2,
      now: () => 1_000
    })).rejects.toMatchObject({ code: "size" });

    const face = manifest.faces[0]!;
    expect(await cache.get(createAssetKey(manifest, face, face.assets[0]!))).toBeUndefined();
  });

  it("bounds parallel Unicode-shard acquisition while preserving manifest order", async () => {
    let active = 0;
    let maximumActive = 0;
    const releases: Array<() => void> = [];
    const fetcher = vi.fn(async (input: string | URL) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise<void>((resolve) => {
        releases.push(() => {
          active -= 1;
          resolve();
        });
      });
      const id = Number(/(\d+)\.woff2$/u.exec(String(input))?.[1] ?? 0);
      return new Response(new Uint8Array([id]), { status: 200 });
    });
    const shardedManifest = createShardedManifest(5);
    const installation = downloadQuireWebFontManifest(shardedManifest, {
      fetch: fetcher,
      cache: createQuireMemoryFontCache(),
      maxAssetBytes: 10,
      maxConcurrentAssets: 2,
      now: () => 1_000
    });

    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    releases.splice(0, 2).forEach((release) => release());
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
    releases.splice(0, 2).forEach((release) => release());
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(5));
    releases.splice(0).forEach((release) => release());

    const installed = await installation;
    expect(maximumActive).toBe(2);
    expect(installed.map((asset) => asset.asset.id)).toEqual([
      "shard-1",
      "shard-2",
      "shard-3",
      "shard-4",
      "shard-5"
    ]);
  });
});

const manifest: QuireWebFontFamilyManifest = {
  providerId: "fixture",
  family: "Fixture Sans",
  version: "1",
  license: { name: "Fixture", url: "https://example.test/license" },
  faces: [{
    id: "regular",
    weight: "400",
    assets: [{
      id: "regular",
      sources: [
        { url: "https://example.test/first.woff2", format: "woff2" },
        { url: "https://example.test/second.woff2", format: "woff2" }
      ]
    }]
  }]
};

/**
 * Creates one face with independently downloadable Unicode shards.
 *
 * @param count - Number of fixture assets.
 * @returns Sharded family manifest.
 */
function createShardedManifest(count: number): QuireWebFontFamilyManifest {
  return {
    providerId: "fixture",
    family: "Fixture CJK",
    version: "1",
    license: { name: "Fixture", url: "https://example.test/license" },
    faces: [{
      id: "regular",
      weight: "400",
      assets: Array.from({ length: count }, (_, index) => ({
        id: `shard-${index + 1}`,
        sources: [{ url: `https://example.test/${index + 1}.woff2` }],
        unicodeRange: `U+${index.toString(16).padStart(4, "0")}`
      }))
    }]
  };
}
