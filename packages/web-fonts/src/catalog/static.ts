import type {
  QuireWebFontCatalog,
  QuireWebFontFamilyManifest
} from "../types";
import { QuireWebFontError } from "../types";
import { normalizeQuireWebFontFamily } from "../resource/identity";

/** Options used to create an immutable host-manifest catalog. */
export interface QuireStaticWebFontCatalogOptions {
  /** Stable catalog and provider identity. */
  readonly id: string;
  /** Complete manifests exposed by the catalog. */
  readonly manifests: readonly QuireWebFontFamilyManifest[];
}

/**
 * Creates an immutable exact-family catalog from host manifests.
 *
 * @param options - Catalog identity and complete manifests.
 * @returns Static catalog.
 */
export function createQuireStaticWebFontCatalog(
  options: QuireStaticWebFontCatalogOptions
): QuireWebFontCatalog {
  const manifests = new Map<string, QuireWebFontFamilyManifest>();
  for (const manifest of options.manifests) {
    if (manifest.providerId !== options.id) {
      throw new QuireWebFontError(
        "catalog",
        `Static web font catalog "${options.id}" cannot expose provider "${manifest.providerId}"`
      );
    }
    const key = normalizeQuireWebFontFamily(manifest.family);
    if (key.length === 0 || manifest.faces.length === 0) {
      throw new QuireWebFontError("catalog", "Static web font manifests require a family and faces");
    }
    if (manifests.has(key)) {
      throw new QuireWebFontError(
        "catalog",
        `Static web font catalog "${options.id}" contains duplicate family "${manifest.family}"`
      );
    }
    manifests.set(key, manifest);
  }
  return {
    id: options.id,
    /** @inheritdoc */
    resolveFamily(family: string): QuireWebFontFamilyManifest | null {
      return manifests.get(normalizeQuireWebFontFamily(family)) ?? null;
    }
  };
}
