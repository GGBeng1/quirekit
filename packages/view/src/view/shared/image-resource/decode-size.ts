import type { QuireMediaIntrinsicSize } from "@quirekit/media";
import type {
  QuireAffineTransform,
  QuireImageCommand
} from "@quirekit/renderer";

/**
 * Picks the smallest decode level of an image that still covers a raster demand.
 *
 * Each level halves the pixel area (axes shrink by √2): a level wastes at most 2x
 * the needed pixels, zoom changes under 41% keep their level, and the final
 * `drawImage` never downsamples by more than √2 per axis.
 *
 * @param intrinsic - Positive intrinsic image size.
 * @param demand - Device pixels the whole image needs.
 * @returns Integer decode size, never larger than the intrinsic size.
 */
export function resolveQuireImageDecodeSize(
  intrinsic: QuireMediaIntrinsicSize,
  demand: QuireMediaIntrinsicSize
): QuireMediaIntrinsicSize {
  // Small tolerance so exact halvings are not lost to floating-point roots.
  const covers = (level: number): boolean => intrinsic.width / 2 ** (level / 2) + 1e-6 >= demand.width
    && intrinsic.height / 2 ** (level / 2) + 1e-6 >= demand.height;
  let level = 0;
  if (demand.width > 0 && demand.height > 0) {
    while (covers(level + 1)) level += 1;
  }
  const factor = 2 ** (level / 2);
  return {
    width: Math.max(1, Math.ceil(intrinsic.width / factor - 1e-6)),
    height: Math.max(1, Math.ceil(intrinsic.height / factor - 1e-6))
  };
}

/**
 * Reads how many display-list units of the whole image one command paints.
 *
 * A crop shows only part of the image in the destination, so the whole image
 * needs proportionally more resolution; rotation and reflection keep the scale.
 *
 * @param command - Image command in display-list units.
 * @param scale - Accumulated scale of enclosing clip transforms.
 * @returns Whole-image demand in display-list units, or undefined for empty paint.
 */
export function readQuireImageCommandDemand(
  command: QuireImageCommand,
  scale: number
): QuireMediaIntrinsicSize | undefined {
  const crop = command.sourceCrop;
  const width = command.rect.width * scale / (crop === undefined ? 1 : 1 - crop.left - crop.right);
  const height = command.rect.height * scale / (crop === undefined ? 1 : 1 - crop.top - crop.bottom);
  return width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)
    ? { width, height }
    : undefined;
}

/**
 * Reads the largest axis scale of a clip transform.
 *
 * @param transform - Optional clip affine.
 * @returns Scale applied to nested commands, 1 without a transform.
 */
export function readQuireAffineScale(transform: QuireAffineTransform | undefined): number {
  return transform === undefined
    ? 1
    : Math.max(Math.hypot(transform.a, transform.b), Math.hypot(transform.c, transform.d));
}
