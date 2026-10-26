import type { QuireMediaIntrinsicSize } from "@quirekit/media";
import type {
  QuireImageSourceCrop,
  QuireRect
} from "@quirekit/renderer";

/**
 * Converts normalized edge crop fractions to intrinsic source coordinates.
 *
 * @param crop - Positive source insets or negative source outsets.
 * @param size - Complete intrinsic source size.
 * @returns Source-space rectangle whose size remains positive by model invariant.
 */
export function resolveQuireImageSourceRect(
  crop: QuireImageSourceCrop,
  size: QuireMediaIntrinsicSize
): QuireRect {
  return {
    x: size.width * crop.left,
    y: size.height * crop.top,
    width: size.width * (1 - crop.left - crop.right),
    height: size.height * (1 - crop.top - crop.bottom)
  };
}
