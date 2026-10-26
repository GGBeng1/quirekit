import {
  createQuireWebFontLoader,
  type QuireWebFontCatalog,
  type QuireWebFontLoader,
  type QuireWebFontLoaderOptions
} from "@quirekit/web-fonts";
import type { ClassicEditorWebFontOptions } from "../../../types";

/**
 * Creates the provider-neutral loader when the host enabled a library.
 *
 * @param configured - Enabled font-library configuration.
 * @param sourceCatalog - Dynamic imported/recommended source adapter.
 * @param ownerDocument - Browser document that owns registered faces.
 * @param probeLocalFamily - Shared exact local-family probe.
 * @returns Configured loader.
 */
export function createClassicConfiguredWebFontLoader(
  configured: ClassicEditorWebFontOptions,
  sourceCatalog: QuireWebFontCatalog,
  ownerDocument: Document,
  probeLocalFamily: (family: string) => Promise<boolean>
): QuireWebFontLoader {
  const loaderOptions: QuireWebFontLoaderOptions = {
    catalogs: [sourceCatalog, ...configured.catalogs],
    ownerDocument,
    authorizeDownload: async (): Promise<boolean> => true,
    probeLocalFamily,
    ...(configured.cache === undefined ? {} : { cache: configured.cache }),
    ...(configured.fetch === undefined ? {} : { fetch: configured.fetch }),
    ...(configured.maxAssetBytes === undefined
      ? {}
      : { maxAssetBytes: configured.maxAssetBytes }),
    ...(configured.maxConcurrentAssets === undefined
      ? {}
      : { maxConcurrentAssets: configured.maxConcurrentAssets })
  };
  return createQuireWebFontLoader(loaderOptions);
}
