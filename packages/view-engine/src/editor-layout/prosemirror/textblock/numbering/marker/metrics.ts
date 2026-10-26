import type { QuireTextMeasurer } from "@quirekit/layout/text";

/**
 * Resolves explicit marker ascent, with a proportional fallback for width-only hosts.
 * @param explicitFontSize - Explicit marker font size in CSS pixels, when set.
 * @param bodyFont - Inherited paragraph font.
 * @param markerFont - Effective marker font used for paint and measurement.
 * @param baseline - Paragraph strut ascent.
 * @param measurer - Host font metrics authority.
 * @returns Marker ascent, or undefined when paragraph size is inherited.
 */
export function resolveExplicitMarkerAscent(
  explicitFontSize: number | undefined,
  bodyFont: string,
  markerFont: string,
  baseline: number,
  measurer: QuireTextMeasurer
): number | undefined {
  if (explicitFontSize === undefined) return undefined;
  const measured = measurer.measureText("Hg", markerFont).ascent;
  if (measured !== undefined && Number.isFinite(measured) && measured > 0) return measured;
  const bodySize = Number(/(\d+(?:\.\d+)?)px/u.exec(bodyFont)?.[1]);
  const markerSize = explicitFontSize;
  return !Number.isFinite(bodySize) || bodySize <= 0 ? baseline : baseline * markerSize / bodySize;
}

/**
 * Resolves first-line strut metrics with an optional external ascender.
 *
 * @param lineHeight - Paragraph strut height.
 * @param baseline - Paragraph strut ascent.
 * @param externalAscent - Optional marker ascent contribution.
 * @returns First-line ascent and total height with unchanged strut descent.
 */
export function resolveFirstLineMetrics(
  lineHeight: number,
  baseline: number,
  externalAscent: number | undefined
): { readonly ascent: number; readonly height: number } {
  if (externalAscent === undefined) return { ascent: baseline, height: lineHeight };
  const ascent = Math.max(baseline, externalAscent ?? 0);
  return { ascent, height: ascent + Math.max(lineHeight - baseline, 0) };
}
