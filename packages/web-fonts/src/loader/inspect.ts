import type {
  QuireWebFontCache,
  QuireWebFontCatalog,
  QuireWebFontFamilyManifest,
  QuireWebFontInspection,
  QuireWebFontRegistry
} from "../types";
import { resolveQuireCachedWebFontCandidates, resolveQuireWebFontCandidates } from "./candidate";

/** Runtime boundaries used by explicit side-effect-free binary inspection. */
export interface QuireWebFontInspectOptions {
  /** Trimmed requested family. */
  readonly family: string;
  /** Browser registry boundary. */
  readonly registry: QuireWebFontRegistry;
  /** Exact local family probe. */
  readonly probeLocalFamily: (family: string) => Promise<boolean>;
  /** Ordered enabled catalogs. */
  readonly catalogs: readonly QuireWebFontCatalog[];
  /** Binary cache boundary. */
  readonly cache: QuireWebFontCache;
  /** Current epoch-millisecond clock. */
  readonly now: () => number;
  /** Late-work lifecycle assertion. */
  readonly assertActive: () => void;
  /** Status phase publisher. */
  readonly publish: (
    family: string,
    phase: "registered" | "local" | "cached" | "downloadable" | "unavailable",
    manifest?: QuireWebFontFamilyManifest
  ) => void;
}

/**
 * Inspects local, registered, cached, and downloadable family availability.
 *
 * @param options - Explicit inspection runtime boundaries.
 * @returns Availability without a font binary download.
 */
export async function inspectQuireWebFontFamily(
  options: QuireWebFontInspectOptions
): Promise<QuireWebFontInspection> {
  if (options.registry.hasFamily(options.family)) {
    options.publish(options.family, "registered");
    return { family: options.family, availability: "registered" };
  }
  if (await options.probeLocalFamily(options.family)) {
    options.assertActive();
    options.publish(options.family, "local");
    return { family: options.family, availability: "local" };
  }
  const manifests = await resolveQuireWebFontCandidates(options.catalogs, options.family);
  options.assertActive();
  const cached = await resolveQuireCachedWebFontCandidates(options.cache, manifests, options.now());
  if (cached[0] !== undefined) {
    options.publish(cached[0].manifest.family, "cached", cached[0].manifest);
    return {
      family: cached[0].manifest.family,
      availability: "cached",
      manifest: cached[0].manifest
    };
  }
  const manifest = manifests[0];
  if (manifest !== undefined) {
    options.publish(manifest.family, "downloadable", manifest);
    return { family: manifest.family, availability: "downloadable", manifest };
  }
  options.publish(options.family, "unavailable");
  return { family: options.family, availability: "unavailable" };
}
