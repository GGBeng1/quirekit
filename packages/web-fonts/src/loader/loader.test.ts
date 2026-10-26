import { describe, expect, it, vi } from "vitest";
import { createQuireMemoryFontCache } from "../cache";
import { createQuireStaticWebFontCatalog } from "../catalog";
import type {
  QuireInstalledWebFontAsset,
  QuireWebFontFamilyManifest,
  QuireWebFontRegistry
} from "../types";
import { createQuireWebFontLoader } from "./loader";

describe("external web-font loader", () => {
  it("downloads only after authorization, falls through a failed provider, and caches", async () => {
    const authorize = vi.fn(async () => true);
    const fetcher = vi.fn(async (input: string | URL) => {
      if (String(input).includes("first")) return new Response(null, { status: 503 });
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "cache-control": "public, max-age=3600" }
      });
    });
    const registry = createRegistry();
    const loader = createQuireWebFontLoader({
      catalogs: [catalog("first"), catalog("second")],
      cache: createQuireMemoryFontCache(),
      registry,
      authorizeDownload: authorize,
      fetch: fetcher
    });

    const inspected = await loader.inspectFamily("Fixture Sans");
    expect(inspected.availability).toBe("downloadable");
    expect(fetcher).not.toHaveBeenCalled();

    const installed = await loader.installFamily("Fixture Sans");
    expect(installed.providerId).toBe("second");
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(registry.register).toHaveBeenCalledTimes(1);

    registry.unregister("Fixture Sans");
    await loader.installFamily("Fixture Sans");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent installation for one normalized family", async () => {
    let release: (() => void) | undefined;
    const fetcher = vi.fn(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
    });
    const registry = createRegistry();
    const loader = createQuireWebFontLoader({
      catalogs: [catalog("only")],
      cache: createQuireMemoryFontCache(),
      registry,
      authorizeDownload: async () => true,
      fetch: fetcher
    });

    const first = loader.installFamily("Fixture Sans");
    const second = loader.installFamily(" fixture   sans ");
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    release?.();

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(registry.register).toHaveBeenCalledTimes(1);
  });

  it("does not download when the host rejects the provider license", async () => {
    const fetcher = vi.fn();
    const loader = createQuireWebFontLoader({
      catalogs: [catalog("only")],
      cache: createQuireMemoryFontCache(),
      registry: createRegistry(),
      authorizeDownload: async () => false,
      fetch: fetcher
    });

    await expect(loader.installFamily("Fixture Sans")).rejects.toMatchObject({
      code: "authorization"
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("restores a complete cached family without authorization or network access", async () => {
    const cache = createQuireMemoryFontCache();
    const manifestCatalog = catalog("cached");
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 200,
      headers: { "cache-control": "public, max-age=3600" }
    }));
    const first = createQuireWebFontLoader({
      catalogs: [manifestCatalog],
      cache,
      registry: createRegistry(),
      authorizeDownload: async () => true,
      fetch: fetcher
    });
    await first.installFamily("Fixture Sans");
    expect(fetcher).toHaveBeenCalledTimes(1);

    const authorize = vi.fn(async () => true);
    const secondRegistry = createRegistry();
    const second = createQuireWebFontLoader({
      catalogs: [manifestCatalog],
      cache,
      registry: secondRegistry,
      authorizeDownload: authorize,
      fetch: fetcher
    });

    const cachedManifest = await manifestCatalog.resolveFamily("Fixture Sans");
    expect(cachedManifest).not.toBeNull();
    const restored = await second.restoreFamily(cachedManifest!);

    expect(restored?.source).toBe("cache");
    expect(secondRegistry.register).toHaveBeenCalledTimes(1);
    expect(authorize).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("prevents registration and readiness after destruction", async () => {
    let release: (() => void) | undefined;
    const fetcher = vi.fn(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
    });
    const registry = createRegistry();
    const onReady = vi.fn();
    const loader = createQuireWebFontLoader({
      catalogs: [catalog("only")],
      cache: createQuireMemoryFontCache(),
      registry,
      authorizeDownload: async () => true,
      fetch: fetcher,
      onReady
    });

    const installation = loader.installFamily("Fixture Sans");
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    loader.destroy();
    release?.();

    await expect(installation).rejects.toMatchObject({ code: "destroyed" });
    expect(registry.register).not.toHaveBeenCalled();
    expect(onReady).not.toHaveBeenCalled();
  });
});

/**
 * Creates one static provider fixture.
 *
 * @param providerId - Provider identity and URL marker.
 * @returns Catalog containing one regular face.
 */
function catalog(providerId: string) {
  const manifest: QuireWebFontFamilyManifest = {
    providerId,
    family: "Fixture Sans",
    version: "1",
    license: { name: "Fixture license", url: "https://example.test/license" },
    faces: [{
      id: "regular",
      weight: "400",
      assets: [{
        id: "regular",
        sources: [{ url: `https://example.test/${providerId}/regular.woff2`, format: "woff2" }]
      }]
    }]
  };
  return createQuireStaticWebFontCatalog({ id: providerId, manifests: [manifest] });
}

/** @returns Minimal observable registry used by loader tests. */
function createRegistry(): QuireWebFontRegistry & {
  readonly register: ReturnType<typeof vi.fn>;
} {
  const installed = new Set<string>();
  const register = vi.fn(async (
    manifest: QuireWebFontFamilyManifest,
    assets: readonly QuireInstalledWebFontAsset[]
  ) => {
    installed.add(manifest.family.toLocaleLowerCase("en-US"));
    return { manifest, assets };
  });
  return {
    register,
    hasFamily(family): boolean {
      return installed.has(family.toLocaleLowerCase("en-US"));
    },
    unregister(family): void {
      installed.delete(family.toLocaleLowerCase("en-US"));
    },
    destroy(): void {
      installed.clear();
    }
  };
}
