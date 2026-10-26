import type { QuireRect } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";

/** Vertical source-flow band used to decide text-fragment ownership. */
export interface QuireTextOwnershipBand {
  /** Inclusive top y coordinate in source-flow space. */
  readonly top: number;
  /** Exclusive bottom y coordinate in source-flow space. */
  readonly bottom: number;
}

/**
 * Checks whether a text fragment's line top belongs to a source-flow band.
 *
 * Top-level body pagination uses this rule so a line whose ink extends below a
 * page still belongs to the page where the line starts. This keeps normal body
 * lines from duplicating across adjacent pages.
 *
 * @param fragment - Text fragment to inspect.
 * @param band - Source-flow band to test.
 * @returns Whether the fragment line starts inside the band.
 */
export function doesQuireTextFragmentStartInFlowBand(
  fragment: QuireTextFragment,
  band: QuireTextOwnershipBand
): boolean {
  return fragment.rect.y >= band.top && fragment.rect.y < band.bottom;
}

/**
 * Checks whether a text fragment's baseline belongs to a source-flow band.
 *
 * Nested flow containers, such as table cells, already receive a parent-visible
 * clip. Their internal text uses baseline ownership so continuation lines do not
 * lose a thin top slice when the line box crosses the clip edge.
 *
 * @param fragment - Text fragment to inspect.
 * @param band - Source-flow band to test.
 * @returns Whether the fragment baseline belongs to the band.
 */
export function doesQuireTextFragmentBaselineBelongToFlowBand(
  fragment: QuireTextFragment,
  band: QuireTextOwnershipBand
): boolean {
  return fragment.baseline >= band.top && fragment.baseline < band.bottom;
}

/**
 * Checks whether a text fragment baseline belongs to a rectangle's vertical band.
 *
 * @param fragment - Text fragment to inspect.
 * @param rect - Rectangle whose vertical band should be tested.
 * @returns Whether the fragment baseline belongs to the rectangle.
 */
export function doesQuireTextFragmentBaselineBelongToRectY(
  fragment: QuireTextFragment,
  rect: Pick<QuireRect, "y" | "height">
): boolean {
  return doesQuireTextFragmentBaselineBelongToFlowBand(fragment, {
    top: rect.y,
    bottom: rect.y + rect.height
  });
}

/**
 * Resolves the local y offset needed to continue owned text inside a flow band.
 *
 * When a line's baseline belongs to the continuation band but its ink box starts
 * above the band, the projected child fragment should resume from the band top
 * instead of painting a clipped upper sliver.
 *
 * @param fragments - Source text fragments retained for one nested band.
 * @param band - Source-flow band that owns the fragments.
 * @returns Additional y offset in source-flow coordinates.
 */
export function resolveQuireTextFragmentFlowOffsetY(
  fragments: readonly QuireTextFragment[],
  band: QuireTextOwnershipBand
): number {
  if (fragments.length === 0) {
    return 0;
  }

  let top = fragments[0]!.rect.y;

  for (let index = 1; index < fragments.length; index += 1) {
    top = Math.min(top, fragments[index]!.rect.y);
  }

  return top < band.top ? band.top - top : 0;
}
