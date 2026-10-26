import type { QuireMediaIntrinsicSize } from "./types";
import type { NormalizedQuireMediaAsset } from "./validation";

/**
 * Compares all stable fields of two normalized assets.
 *
 * @param left - Existing normalized asset.
 * @param right - Newly normalized candidate.
 * @returns True when registration is exactly idempotent.
 */
export function areNormalizedQuireMediaAssetsEqual(
  left: NormalizedQuireMediaAsset,
  right: NormalizedQuireMediaAsset
): boolean {
  return (
    left.assetId === right.assetId &&
    left.kind === right.kind &&
    left.mimeType === right.mimeType &&
    left.fileName === right.fileName &&
    areIntrinsicSizesEqual(left.intrinsicSize, right.intrinsicSize) &&
    areBytesEqual(left.bytes, right.bytes)
  );
}

/**
 * Compares optional intrinsic dimensions.
 *
 * @param left - First optional dimensions.
 * @param right - Second optional dimensions.
 * @returns True when both dimensions are absent or exactly equal.
 */
function areIntrinsicSizesEqual(
  left: QuireMediaIntrinsicSize | undefined,
  right: QuireMediaIntrinsicSize | undefined
): boolean {
  return (
    left === right ||
    (left !== undefined &&
      right !== undefined &&
      left.width === right.width &&
      left.height === right.height)
  );
}

/**
 * Compares portable byte arrays without decoding their contents.
 *
 * @param left - First byte array.
 * @param right - Second byte array.
 * @returns True when lengths and every byte are equal.
 */
function areBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}
