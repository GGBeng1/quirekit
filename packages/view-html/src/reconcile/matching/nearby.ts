import type { HtmlContainerDesc, HtmlDescriptor } from "../../descriptors";
import type { HtmlTargetDescriptor } from "../types";
import { isHtmlStructuralMatchCompatible } from "./matchable";

/** Maximum number of nearby siblings inspected after the current cursor. */
export const htmlSiblingMatchLookahead = 5;

/**
 * Finds a compatible descriptor within the fixed sibling lookahead.
 *
 * @param parent - Parent bounding structural ownership.
 * @param children - Existing direct children.
 * @param target - Desired child to match.
 * @param from - First candidate index after the current cursor.
 * @param used - Identities already reserved for other targets.
 * @param blockedSourceIds - Duplicate explicit target claims.
 * @returns Nearby compatible descriptor, or null.
 */
export function findNearbyHtmlDescriptorMatch(
  parent: HtmlContainerDesc,
  children: readonly HtmlDescriptor[],
  target: HtmlTargetDescriptor,
  from: number,
  used: ReadonlySet<HtmlDescriptor>,
  blockedSourceIds: ReadonlySet<string>
): HtmlDescriptor | null {
  const to = Math.min(children.length, from + htmlSiblingMatchLookahead);

  for (let index = from; index < to; index += 1) {
    const candidate = children[index];

    if (
      candidate &&
      !used.has(candidate) &&
      isHtmlStructuralMatchCompatible(parent, candidate, target, blockedSourceIds)
    ) {
      return candidate;
    }
  }
  return null;
}
