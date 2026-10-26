import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";

/**
 * Retains the nearest independent story while traversing nested body flow.
 * @param region - Exact node or query-product owner.
 * @param inherited - Story surrounding a table, control, or other nested flow.
 * @returns Independent story region, or undefined for the main body.
 */
export function resolveNavigationStoryRegion(
  region: QuireLayoutRegionRef | undefined,
  inherited: QuireLayoutRegionRef | undefined
): QuireLayoutRegionRef | undefined {
  switch (region?.kind) {
    case "header":
    case "footer":
    case "footnote":
    case "endnote":
    case "text-box":
    case "drawing-text":
      return region;
    default:
      return inherited;
  }
}

/**
 * Keeps keyboard navigation within one story and repeated header/footer instance.
 * @param first - Candidate story region.
 * @param second - Current caret story region.
 * @returns Whether both carets participate in the same editable flow.
 */
export function isSameNavigationStory(
  first: QuireLayoutRegionRef | undefined,
  second: QuireLayoutRegionRef | undefined
): boolean {
  if (first === undefined || second === undefined) return first === second;
  if (first.kind !== second.kind || first.rootId.value !== second.rootId.value
    || first.regionId.value !== second.regionId.value) return false;
  return first.kind !== "header" && first.kind !== "footer"
    || first.visualInstanceId === second.visualInstanceId;
}
