import type { QuireFontServiceSource } from "@quirekit/render-contract";
import type { QuireWebFontInstallation } from "../types";

/**
 * Maps explicitly shaping-compatible installed assets to Layout font sources.
 *
 * Google Fonts CSS shards intentionally do not opt in because a Unicode-range
 * shard is not necessarily a standalone full-coverage shaping face.
 *
 * @param installation - Completed cache or network installation.
 * @returns Layout-compatible sources in manifest order.
 */
export function toQuireFontServiceSources(
  installation: QuireWebFontInstallation
): readonly QuireFontServiceSource[] {
  const manifest = installation.manifest;
  const assets = installation.assets;
  if (manifest === undefined || assets === undefined) return [];
  return assets
    .filter((installed) => installed.asset.shaping === true)
    .map((installed) => ({
      id: [
        "web-font",
        manifest.providerId,
        manifest.version,
        installed.face.id,
        installed.asset.id
      ].map(encodeURIComponent).join(":"),
      family: manifest.family,
      ...(manifest.genericFamily === undefined
        ? {}
        : { genericFamily: manifest.genericFamily }),
      data: installed.data,
      ...(installed.asset.faceIndex === undefined
        ? {}
        : { faceIndex: installed.asset.faceIndex }),
      ...(installed.face.style === undefined ? {} : { style: installed.face.style }),
      ...(installed.face.weight === undefined ? {} : { weight: installed.face.weight })
    }));
}
