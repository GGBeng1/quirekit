import type {
  QuireLayoutRegion
} from "@quirekit/layout/identity";

/**
 * Creates the snapshot-unique visual address for one retained region.
 *
 * @param region - Retained region to address.
 * @returns Stable root, region, and visual-instance key.
 */
export function createQuireLayoutRegionKey(region: QuireLayoutRegion): string {
  return [
    region.ref.rootId.value,
    region.ref.regionId.value,
    region.ref.visualInstanceId ?? ""
  ].join(":");
}

/**
 * Reports whether duplicate region declarations have identical authority facts.
 *
 * @param left - First retained region.
 * @param right - Second retained region.
 * @returns Whether both declarations represent the same canonical region.
 */
export function areQuireLayoutRegionsEqual(
  left: QuireLayoutRegion,
  right: QuireLayoutRegion
): boolean {
  return left.ref.kind === right.ref.kind
    && sameRegionSource(left.source, right.source)
    && sameRegionRect(left.rect, right.rect)
    && left.coordinateSpace === right.coordinateSpace
    && sameCapabilities(left.capabilities, right.capabilities);
}

/**
 * Reports whether two optional region sources are identical.
 *
 * @param left - First optional source.
 * @param right - Second optional source.
 * @returns Whether both sources carry the same identity and range.
 */
function sameRegionSource(
  left: QuireLayoutRegion["source"],
  right: QuireLayoutRegion["source"]
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return left.sourceId === right.sourceId
    && left.range?.from === right.range?.from
    && left.range?.to === right.range?.to;
}

/**
 * Reports whether two optional region rectangles are identical.
 *
 * @param left - First optional rectangle.
 * @param right - Second optional rectangle.
 * @returns Whether both rectangles carry the same geometry.
 */
function sameRegionRect(
  left: QuireLayoutRegion["rect"],
  right: QuireLayoutRegion["rect"]
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

/**
 * Reports whether two explicit capability sets are equal.
 *
 * @param left - First capability set.
 * @param right - Second capability set.
 * @returns Whether all capability flags match.
 */
function sameCapabilities(
  left: QuireLayoutRegion["capabilities"],
  right: QuireLayoutRegion["capabilities"]
): boolean {
  return left.editable === right.editable
    && left.selectable === right.selectable
    && left.focusable === right.focusable
    && left.copyable === right.copyable
    && left.commandable === right.commandable
    && left.accessible === right.accessible;
}
