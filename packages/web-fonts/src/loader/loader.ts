import { normalizeQuireWebFontFamily } from "../resource/identity";
import type {
  QuireInstalledWebFontAsset,
  QuireWebFontFamilyManifest,
  QuireWebFontInspection,
  QuireWebFontInstallation,
  QuireWebFontLoader,
  QuireWebFontLoaderOptions,
  QuireWebFontStatus
} from "../types";
import { QuireWebFontError } from "../types";
import {
  asQuireWebFontError,
  requireQuireWebFontFamily
} from "./errors";
import {
  createQuireDefaultFontCache,
  createQuireDefaultFontRegistry,
  createQuireDefaultLocalProbe,
  getQuireDefaultFetch,
  getQuireGlobalDocument
} from "./environment";
import { inspectQuireWebFontFamily } from "./inspect";
import { installQuireWebFontFamily } from "./install";
import { readQuireCachedWebFontAssets } from "../resource/cache";
import { createQuireWebFontStatusStore } from "./status";

const DEFAULT_MAX_ASSET_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_CONCURRENT_ASSETS = 8;

/**
 * Creates an explicit, host-authorized external web-font runtime.
 *
 * @param options - Catalog, policy, browser, cache, and lifecycle boundaries.
 * @returns Stateful font inspection and installation API.
 */
export function createQuireWebFontLoader(
  options: QuireWebFontLoaderOptions
): QuireWebFontLoader {
  const ownerDocument = options.ownerDocument ?? getQuireGlobalDocument();
  const registry = options.registry ?? createQuireDefaultFontRegistry(ownerDocument);
  const cache = options.cache ?? createQuireDefaultFontCache();
  const fetcher = options.fetch ?? getQuireDefaultFetch();
  const now = options.now ?? Date.now;
  const maxAssetBytes = options.maxAssetBytes ?? DEFAULT_MAX_ASSET_BYTES;
  const maxConcurrentAssets = options.maxConcurrentAssets ?? DEFAULT_MAX_CONCURRENT_ASSETS;
  const probeLocalFamily = options.probeLocalFamily ?? createQuireDefaultLocalProbe(ownerDocument);
  const installed = new Map<string, QuireWebFontInstallation>();
  const pending = new Map<string, Promise<QuireWebFontInstallation>>();
  const pendingRestores = new Map<string, Promise<QuireWebFontInstallation | null>>();
  const readyNotified = new Set<string>();
  let destroyed = false;
  const statusStore = createQuireWebFontStatusStore(() => destroyed);

  if (!Number.isFinite(maxAssetBytes) || maxAssetBytes <= 0) {
    throw new QuireWebFontError("size", "maxAssetBytes must be a positive finite number");
  }
  if (!Number.isInteger(maxConcurrentAssets) || maxConcurrentAssets <= 0) {
    throw new QuireWebFontError(
      "size",
      "maxConcurrentAssets must be a positive integer"
    );
  }

  /** Throws when late asynchronous work outlives the loader. */
  function assertActive(): void {
    if (destroyed) throw new QuireWebFontError("destroyed", "Web font loader is destroyed");
  }

  /** Publishes readiness at most once until explicit family removal. */
  function notifyReady(key: string, result: QuireWebFontInstallation): void {
    if (destroyed || readyNotified.has(key)) return;
    readyNotified.add(key);
    options.onReady?.(result);
  }

  /** Registers one complete candidate and publishes its authoritative result. */
  async function registerInstallation(
    manifest: QuireWebFontFamilyManifest,
    assets: readonly QuireInstalledWebFontAsset[],
    source: "cache" | "download"
  ): Promise<QuireWebFontInstallation> {
    statusStore.publish(manifest.family, "registering", manifest);
    const registered = await registry.register(manifest, assets);
    assertActive();
    const key = normalizeQuireWebFontFamily(registered.manifest.family);
    const result: QuireWebFontInstallation = {
      family: registered.manifest.family,
      providerId: registered.manifest.providerId,
      source,
      persistent: registered.assets.every((asset) => asset.persistent),
      manifest: registered.manifest,
      assets: registered.assets
    };
    installed.set(key, result);
    statusStore.publish(registered.manifest.family, "installed", registered.manifest);
    notifyReady(key, result);
    return result;
  }

  return {
    /** @inheritdoc */
    getStatus(family: string): QuireWebFontStatus {
      requireQuireWebFontFamily(family);
      return statusStore.get(family);
    },
    /** @inheritdoc */
    subscribe(listener: (status: QuireWebFontStatus) => void): () => void {
      assertActive();
      return statusStore.subscribe(listener);
    },
    /** @inheritdoc */
    async inspectFamily(family: string): Promise<QuireWebFontInspection> {
      requireQuireWebFontFamily(family);
      assertActive();
      const requested = family.trim();
      statusStore.publish(requested, "inspecting");
      try {
        return await inspectQuireWebFontFamily({
          family: requested,
          registry,
          probeLocalFamily,
          catalogs: options.catalogs,
          cache,
          now,
          assertActive,
          publish: (target, phase, manifest): void => {
            statusStore.publish(target, phase, manifest);
          }
        });
      } catch (error) {
        const typed = asQuireWebFontError(error, requested);
        statusStore.publish(requested, "error", undefined, typed);
        throw typed;
      }
    },
    /** @inheritdoc */
    installFamily(family: string): Promise<QuireWebFontInstallation> {
      const key = requireQuireWebFontFamily(family);
      assertActive();
      const existing = pending.get(key);
      if (existing !== undefined) return existing;
      const requested = family.trim();
      const request = installQuireWebFontFamily({
        family: requested,
        registry,
        installed,
        probeLocalFamily,
        catalogs: options.catalogs,
        cache,
        fetch: fetcher,
        maxAssetBytes,
        maxConcurrentAssets,
        now,
        authorizeDownload: async (manifest) => options.authorizeDownload({ manifest }),
        assertActive,
        publish: (target, phase, manifest): void => {
          statusStore.publish(target, phase, manifest);
        },
        completeImmediate: (result, phase) => {
          installed.set(key, result);
          statusStore.publish(requested, phase, result.manifest);
          notifyReady(key, result);
          return result;
        },
        registerInstallation
      }).catch((error: unknown) => {
        const typed = asQuireWebFontError(error, family.trim());
        statusStore.publish(family.trim(), "error", undefined, typed);
        throw typed;
      }).finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      });
      pending.set(key, request);
      return request;
    },
    /** @inheritdoc */
    restoreFamily(
      manifest: QuireWebFontFamilyManifest
    ): Promise<QuireWebFontInstallation | null> {
      const key = requireQuireWebFontFamily(manifest.family);
      assertActive();
      const existing = pendingRestores.get(key);
      if (existing !== undefined) return existing;

      // Restore consumes a product-persisted manifest directly, so catalog
      // resolution and provider authorization can never create network work.
      const request = (async (): Promise<QuireWebFontInstallation | null> => {
        if (registry.hasFamily(manifest.family)) {
          return {
            family: manifest.family,
            providerId: manifest.providerId,
            source: "registered",
            persistent: false,
            manifest
          };
        }
        if (await probeLocalFamily(manifest.family)) {
          const result: QuireWebFontInstallation = {
            family: manifest.family,
            source: "local",
            persistent: true
          };
          installed.set(key, result);
          statusStore.publish(manifest.family, "local", manifest);
          notifyReady(key, result);
          return result;
        }
        assertActive();
        const assets = await readQuireCachedWebFontAssets(cache, manifest, now());
        assertActive();
        if (assets === null) {
          statusStore.publish(manifest.family, "downloadable", manifest);
          return null;
        }
        return registerInstallation(manifest, assets, "cache");
      })().catch((error: unknown) => {
        const typed = asQuireWebFontError(error, manifest.family);
        statusStore.publish(manifest.family, "error", manifest, typed);
        throw typed;
      }).finally(() => {
        if (pendingRestores.get(key) === request) pendingRestores.delete(key);
      });
      pendingRestores.set(key, request);
      return request;
    },
    /** @inheritdoc */
    async removeFamily(family: string): Promise<void> {
      const key = requireQuireWebFontFamily(family);
      assertActive();
      registry.unregister(family);
      installed.delete(key);
      readyNotified.delete(key);
      await cache.deleteFamily(key);
      statusStore.publish(family.trim(), "idle");
    },
    /** @inheritdoc */
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      registry.destroy();
      cache.destroy?.();
      statusStore.destroy();
      installed.clear();
      pending.clear();
      pendingRestores.clear();
      readyNotified.clear();
    }
  };
}
