import {
  createQuireImageTransformMatrix,
  type QuireImageCommand
} from "../core/display-list";
import { formatSvgAffineTransform } from "./affine-transform";

/**
 * Formats one semantic image transform for live or static SVG output.
 *
 * @param command - Image command carrying destination geometry and transform.
 * @returns SVG matrix value, or undefined for the identity fast path.
 */
export function formatSvgImageTransform(
  command: QuireImageCommand
): string | undefined {
  const matrix = createQuireImageTransformMatrix(
    command.rect,
    command.transform
  );
  if (matrix === null) {
    return undefined;
  }

  return formatSvgAffineTransform(matrix);
}
