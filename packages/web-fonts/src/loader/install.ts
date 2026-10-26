import { downloadQuireWebFontManifest } from "../resource/fetch";
import { normalizeQuireWebFontFamily } from "../resource/identity";
import type {
  QuireInstalledWebFontAsset,
  QuireWebFontCache,
  QuireWebFontCatalog,
  QuireWebFontFamilyManifest,
  QuireWebFontFetch,
  QuireWebFontInstallation,
  QuireWebFontRegistry
} from "../types";
import { QuireWebFontError } from "../types";
import { resolveQuireCachedWebFontCandidates, resolveQuireWebFontCandidates } from "./candidate";
import { asQuireWebFontError, isTerminalQuireWebFontError } from "./errors";

/** Runtime boundaries for one non-coalescing family installation. */
export interface QuireWebFontInstallOptions {
  /** Trimmed logical family. */
  readonly family: string;
  /** Browser registration boundary. */
  readonly registry: QuireWebFontRegistry;
  /** Previously completed installations. */
  readonly installed: ReadonlyMap<string, QuireWebFontInstallation>;
  /** Exact local-family probe. */
  readonly probeLocalFamily: (family: string) => Promise<boolean>;
  /** Ordered enabled catalogs. */
  readonly catalogs: readonly QuireWebFontCatalog[];
  /** Binary cache boundary. */
  readonly cache: QuireWebFontCache;
  /** Fetch boundary. */
  readonly fetch: QuireWebFontFetch;
  /** Maximum bytes accepted for one asset. */
  readonly maxAssetBytes: number;
  /** Maximum assets fetched concurrently for one manifest. */
  readonly maxConcurrentAssets: number;
  /** Current epoch-millisecond clock. */
  readonly now: () => number;
  /** Host authorization boundary. */
  readonly authorizeDownload: (manifest: QuireWebFontFamilyManifest) => boolean | Promise<boolean>;
  /** Late-work lifecycle assertion. */
  readonly assertActive: () => void;
  /** Status publisher. */
  readonly publish: (
    family: string,
    phase: "registered" | "local" | "inspecting" | "authorizing" | "downloading",
    manifest?: QuireWebFontFamilyManifest
  ) => void;
  /** Completes a local or already-registered result. */
  readonly completeImmediate: (
    result: QuireWebFontInstallation,
    phase: "registered" | "local"
  ) => QuireWebFontInstallation;
  /** Registers one complete cache or network candidate. */
  readonly registerInstallation: (
    manifest: QuireWebFontFamilyManifest,
    assets: readonly QuireInstalledWebFontAsset[],
    source: "cache" | "download"
  ) => Promise<QuireWebFontInstallation>;
}

/**
 * Performs one provider-ordered installation after request coalescing.
 *
 * @param options - Installation lifecycle boundaries.
 * @returns Authoritative local, cached, registered, or downloaded result.
 */
export async function installQuireWebFontFamily(
  options: QuireWebFontInstallOptions
): Promise<QuireWebFontInstallation> {
  options.assertActive();
  const key = normalizeQuireWebFontFamily(options.family);
  if (options.registry.hasFamily(options.family)) {
    return options.completeImmediate(options.installed.get(key) ?? {
      family: options.family,
      source: "registered",
      persistent: false
    }, "registered");
  }
  if (await options.probeLocalFamily(options.family)) {
    options.assertActive();
    return options.completeImmediate({
      family: options.family,
      source: "local",
      persistent: true
    }, "local");
  }

  options.publish(options.family, "inspecting");
  const manifests = await resolveQuireWebFontCandidates(options.catalogs, options.family);
  options.assertActive();
  if (manifests.length === 0) {
    throw new QuireWebFontError("catalog", `No enabled web font catalog provides "${options.family}"`);
  }

  // Prefer complete cache candidates before authorizing any fresh third-party request.
  const cachedCandidates = await resolveQuireCachedWebFontCandidates(
    options.cache,
    manifests,
    options.now()
  );
  for (const candidate of cachedCandidates) {
    try {
      return await options.registerInstallation(candidate.manifest, candidate.assets, "cache");
    } catch (error) {
      if (isTerminalQuireWebFontError(error)) throw error;
    }
  }

  let lastError: unknown;
  for (const manifest of manifests) {
    try {
      options.publish(manifest.family, "authorizing", manifest);
      const authorized = await options.authorizeDownload(manifest);
      options.assertActive();
      if (!authorized) {
        throw new QuireWebFontError(
          "authorization",
          `Host rejected web font provider "${manifest.providerId}"`,
          { providerId: manifest.providerId }
        );
      }
      options.publish(manifest.family, "downloading", manifest);
      const assets = await downloadQuireWebFontManifest(manifest, options);
      options.assertActive();
      return await options.registerInstallation(manifest, assets, "download");
    } catch (error) {
      if (isTerminalQuireWebFontError(error)) throw error;
      lastError = error;
    }
  }
  throw asQuireWebFontError(lastError, options.family);
}
