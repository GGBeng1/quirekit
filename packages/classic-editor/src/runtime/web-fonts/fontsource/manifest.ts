import type {
  QuireWebFontFamilyManifest,
  QuireWebFontLicenseNotice
} from "@quirekit/web-fonts";
import type { FontsourceFamilyDetails } from "./types";

const SOURCE_ID = "fontsource";

/**
 * Compiles exact Fontsource metadata into one atomic install manifest.
 *
 * @param details - Valid family metadata including immutable package version.
 * @returns Installable provider-neutral manifest.
 */
export function createFontsourceManifest(
  details: FontsourceFamilyDetails
): QuireWebFontFamilyManifest {
  const weights = selectWeights(details.weights);
  const styles = details.styles.includes("normal")
    ? ["normal", ...(details.styles.includes("italic") ? ["italic"] : [])]
    : details.styles.slice(0, 1);
  const faces = weights.flatMap((weight) => styles.flatMap((style) => {
    // Coverage is owned by each face's real assets, not the directory's default
    // subset (often Latin even for CJK). Keep numbered Unicode-range shards too.
    const assets = Object.keys(details.variants[String(weight)]?.[style] ?? {}).flatMap((subset) => {
      const variant = details.variants[String(weight)]?.[style]?.[subset];
      const latestUrl = variant?.url.woff2;
      if (latestUrl === undefined) return [];
      const unicodeRange = details.unicodeRange[subset] ?? details.unicodeRange[`[${subset}]`];
      return [{
        id: `${subset}-${weight}-${style}`,
        sources: [{
          url: pinFontsourceAssetUrl(latestUrl, details.npmVersion),
          format: "woff2" as const
        }],
        ...(unicodeRange === undefined ? {} : { unicodeRange }),
        cacheMaxAgeSeconds: 31_536_000
      }];
    });
    if (assets.length === 0) return [];
    return [{ id: `${weight}-${style}`, weight: String(weight), style, assets }];
  }));
  if (faces.length === 0) {
    throw new Error(`Fontsource has no supported WOFF2 assets for "${details.family}".`);
  }
  return {
    providerId: SOURCE_ID,
    familyId: details.id,
    family: details.family,
    version: details.npmVersion,
    license: createFontsourceLicense(details.license),
    ...(toGenericFamily(details.category) === undefined
      ? {}
      : { genericFamily: toGenericFamily(details.category) }),
    faces
  };
}

/**
 * Creates a stable SPDX-backed license disclosure.
 *
 * @param spdxId - Provider SPDX identifier.
 * @returns Product-visible license notice.
 */
export function createFontsourceLicense(spdxId: string): QuireWebFontLicenseNotice {
  return {
    name: spdxId,
    url: `https://spdx.org/licenses/${encodeURIComponent(spdxId)}.html`,
    spdxId
  };
}

/**
 * Selects regular and bold faces, falling back to the closest available weight.
 *
 * @param weights - Available provider weights.
 * @returns Minimal regular-and-bold weight set.
 */
function selectWeights(weights: readonly number[]): readonly number[] {
  if (weights.length === 0) return [];
  const regular = weights.includes(400)
    ? 400
    : [...weights].sort((left, right) => Math.abs(left - 400) - Math.abs(right - 400))[0];
  const bold = weights.includes(700) ? 700 : undefined;
  return [...new Set([regular, bold].filter((value): value is number => value !== undefined))];
}

/**
 * Replaces Fontsource's moving CDN tag with the resolved immutable package version.
 *
 * @param url - Provider jsDelivr asset URL.
 * @param version - Exact npm package version.
 * @returns Immutable asset URL.
 */
function pinFontsourceAssetUrl(url: string, version: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "cdn.jsdelivr.net") {
    throw new TypeError("Fontsource asset URL must use the official jsDelivr HTTPS host.");
  }
  const movingPath = parsed.pathname;
  parsed.pathname = parsed.pathname.replace("@latest/", `@${version}/`);
  if (parsed.pathname === movingPath || parsed.pathname.includes("@latest/")) {
    throw new TypeError("Fontsource asset URL could not be pinned.");
  }
  return parsed.href;
}

/**
 * Maps supported provider categories to CSS generic families.
 *
 * @param category - Provider category.
 * @returns Supported CSS generic family or `undefined`.
 */
function toGenericFamily(category: string): QuireWebFontFamilyManifest["genericFamily"] {
  if (category === "sans-serif" || category === "serif" || category === "monospace") {
    return category;
  }
  return undefined;
}
