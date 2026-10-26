import type { QuireHitTestResult } from "../../types";

/**
 * Reports whether a retained sub-layout hit owns enough visual identity to beat
 * raw rendered text for the same point.
 *
 * Table sub-layout query products may retain canonical page-local cell identity
 * while the flattened text node is only a paint artifact. Prefer the identified
 * sub-layout hit so range extension, repeated fragments, and selection geometry
 * keep the same visual owner across Canvas, SVG, and HTML backends. Identity-less
 * products still use raw text positions instead of inventing ownership.
 *
 * @param subLayoutHit - Candidate hit produced by retained sub-layout queries.
 * @returns Whether the sub-layout hit should be used before raw text positions.
 */
export function shouldUseQuireSubLayoutHitBeforeRawTextPosition(
  subLayoutHit: QuireHitTestResult | null
): subLayoutHit is QuireHitTestResult {
  return hasQuireSubLayoutHitVisualIdentity(subLayoutHit);
}

/**
 * Reports whether a retained sub-layout hit is authoritative enough to beat a
 * structural table target for the same point.
 *
 * @param subLayoutHit - Candidate hit produced by retained sub-layout queries.
 * @param tableTarget - Candidate hit produced by the structural table target.
 * @returns Whether the sub-layout hit should be used before the table target.
 */
export function shouldUseQuireSubLayoutHitBeforeStructuralTableTarget(
  subLayoutHit: QuireHitTestResult,
  tableTarget: QuireHitTestResult | null
): boolean {
  if (tableTarget === null) {
    return true;
  }

  return hasQuireSubLayoutHitVisualIdentity(subLayoutHit);
}

/**
 * Checks whether a hit result carries visual ownership from retained query
 * products.
 *
 * @param hit - Hit-test result to inspect.
 * @returns Whether the hit can authoritatively identify its visual owner.
 */
function hasQuireSubLayoutHitVisualIdentity(
  hit: QuireHitTestResult | null
): hit is QuireHitTestResult {
  return (
    hit?.kind === "position" &&
    (hit.queryOwner !== undefined || hit.viewRegion !== undefined)
  );
}
