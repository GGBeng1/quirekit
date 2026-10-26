import type { QuireAffineTransform } from "../core/geometry";
import { formatSvgNumber } from "./format";

/**
 * Formats one renderer-neutral affine as an SVG matrix value.
 *
 * @param transform - Canvas/SVG coefficient-order affine.
 * @returns Deterministic SVG matrix value.
 */
export function formatSvgAffineTransform(
  transform: QuireAffineTransform
): string {
  return `matrix(${[
    transform.a,
    transform.b,
    transform.c,
    transform.d,
    transform.e,
    transform.f
  ].map(formatSvgNumber).join(" ")})`;
}
