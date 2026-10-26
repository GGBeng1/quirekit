import type { QuireWebFontFace } from "../types";
import { parseWebFontCss } from "./css-parser";

/** Parsed Google CSS response required to build one manifest. */
export interface QuireParsedGoogleFontsCss {
  /** Family spelling declared by the CSS response. */
  readonly family: string;
  /** Version derived from immutable gstatic asset paths. */
  readonly version: string;
  /** Faces grouped by CSS descriptors with Unicode shards preserved. */
  readonly faces: readonly QuireWebFontFace[];
}

/**
 * Parses the controlled `@font-face` subset returned by Google Fonts CSS2.
 *
 * @param css - Complete provider stylesheet.
 * @param requestedFamily - Configured family used to reject provider mismatch.
 * @returns Parsed family, version, and descriptor-grouped faces.
 */
export function parseGoogleFontsCss(
  css: string,
  requestedFamily: string
): QuireParsedGoogleFontsCss {
  const parsed = parseWebFontCss(css, {
    requestedFamily,
    providerLabel: "Google Fonts"
  });
  const versions = new Set(parsed.faces.flatMap((face) => (
    face.assets.flatMap((asset) => asset.sources.flatMap((source) => {
      const version = new URL(source.url).pathname.match(/\/(v\d+)\//)?.[1];
      return version === undefined ? [] : [version];
    }))
  )));
  return {
    ...parsed,
    version: versions.size === 0 ? "css2" : [...versions].sort().join("+")
  };
}
