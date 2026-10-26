import { createQuireBrowserFontRegistry, createQuireLocalFontProbe } from "../browser";
import { createQuireIndexedDbFontCache, createQuireMemoryFontCache } from "../cache";
import type {
  QuireWebFontCache,
  QuireWebFontFetch,
  QuireWebFontRegistry
} from "../types";
import { QuireWebFontError } from "../types";

/** @returns Global document when running in a browser realm. */
export function getQuireGlobalDocument(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}

/** @returns Default cache with IndexedDB preference and memory fallback. */
export function createQuireDefaultFontCache(): QuireWebFontCache {
  try {
    return createQuireIndexedDbFontCache();
  } catch {
    return createQuireMemoryFontCache();
  }
}

/**
 * Creates the default registry for one document.
 *
 * @param ownerDocument - Owning browser document.
 * @returns Browser registry.
 */
export function createQuireDefaultFontRegistry(
  ownerDocument: Document | undefined
): QuireWebFontRegistry {
  const Constructor = ownerDocument?.defaultView?.FontFace ?? globalThis.FontFace;
  if (ownerDocument === undefined || Constructor === undefined) {
    throw new QuireWebFontError("unsupported", "A browser document or custom font registry is required");
  }
  return createQuireBrowserFontRegistry({ fontSet: ownerDocument.fonts, FontFace: Constructor });
}

/**
 * Creates the default exact local-family probe.
 *
 * @param ownerDocument - Owning browser document.
 * @returns Local probe or a deterministic unavailable result.
 */
export function createQuireDefaultLocalProbe(
  ownerDocument: Document | undefined
): (family: string) => Promise<boolean> {
  const Constructor = ownerDocument?.defaultView?.FontFace ?? globalThis.FontFace;
  return Constructor === undefined
    ? async (): Promise<boolean> => false
    : createQuireLocalFontProbe({ FontFace: Constructor });
}

/** @returns Global fetch bound to its realm, or an unsupported stub. */
export function getQuireDefaultFetch(): QuireWebFontFetch {
  if (globalThis.fetch !== undefined) return globalThis.fetch.bind(globalThis);
  return async (): Promise<Response> => {
    throw new QuireWebFontError("unsupported", "Fetch is unavailable in this realm");
  };
}
