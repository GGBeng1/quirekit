import type { QuireMediaAssetResolver } from "../asset/types";
import { decodeQuireImageDataUrl } from "./data-url";

/**
 * Explicit resource policy for portable raster previews stored in document data.
 * It does not fetch external URLs or retain browser objects.
 * @returns A resolver accepting bounded, signature-matching PNG/JPEG data URLs.
 */
export function createQuireInlineImageResolver(): QuireMediaAssetResolver {
  return {
    /** @param reference - Explicit portable resource request. @returns Decoded bytes, or an unclaimed resource. */
    resolve(reference) {
      if (reference.kind !== "external" || reference.href.length > 24 * 1024 * 1024
        || !/^data:image\/(png|jpeg);base64,/u.test(reference.href)) return undefined;
      const image = decodeQuireImageDataUrl(reference.href);
      if (!image || image.bytes.length > 16 * 1024 * 1024) return undefined;
      const bytes = image.bytes;
      const valid = image.mimeType === "image/png"
        ? bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
        : bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      return valid ? { reference, kind: "image", mimeType: image.mimeType, bytes } : undefined;
    },
  };
}
