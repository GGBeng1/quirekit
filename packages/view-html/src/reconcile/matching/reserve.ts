import type { HtmlContainerDesc, HtmlDescriptor } from "../../descriptors";
import type { HtmlTargetDescriptor } from "../types";
import {
  isHtmlExplicitSourceMatchCompatible,
  isHtmlUnchangedTail
} from "./matchable";
import { collectDistinctHtmlSourceMatches } from "./source";

/**
 * Reserves unique explicit source identities before structural matching.
 *
 * @param parent - Parent bounding every source ownership decision.
 * @param children - Existing direct retained children.
 * @param targets - Desired direct children.
 * @param matches - Mutable target match output.
 * @param used - Mutable retained identity set.
 * @param blockedSourceIds - Duplicate explicit target claims.
 */
export function reserveHtmlExplicitSourceMatches(
  parent: HtmlContainerDesc,
  children: readonly HtmlDescriptor[],
  targets: readonly HtmlTargetDescriptor[],
  matches: (HtmlDescriptor | null)[],
  used: Set<HtmlDescriptor>,
  blockedSourceIds: ReadonlySet<string>
): void {
  const sourceMatches = collectDistinctHtmlSourceMatches(parent, children);

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const descriptor = target
      ? sourceMatches.get(target.source.sourceId)
      : undefined;

    if (
      target &&
      descriptor &&
      !used.has(descriptor) &&
      isHtmlExplicitSourceMatchCompatible(
        parent,
        descriptor,
        target,
        blockedSourceIds
      )
    ) {
      matches[index] = descriptor;
      used.add(descriptor);
    }
  }
}

/**
 * Reserves an exact mapped suffix without searching away from either tail.
 *
 * @param parent - Parent bounding structural ownership.
 * @param children - Existing direct children.
 * @param targets - Desired direct children.
 * @param matches - Mutable target match output.
 * @param used - Mutable retained identity set.
 * @param blockedSourceIds - Duplicate explicit target claims.
 */
export function reserveHtmlUnchangedTail(
  parent: HtmlContainerDesc,
  children: readonly HtmlDescriptor[],
  targets: readonly HtmlTargetDescriptor[],
  matches: (HtmlDescriptor | null)[],
  used: Set<HtmlDescriptor>,
  blockedSourceIds: ReadonlySet<string>
): void {
  let childIndex = children.length - 1;
  let targetIndex = targets.length - 1;

  while (childIndex >= 0 && targetIndex >= 0) {
    const descriptor = children[childIndex];
    const target = targets[targetIndex];
    const reserved = matches[targetIndex];

    if (reserved) {
      if (reserved !== descriptor) {
        break;
      }
      childIndex -= 1;
      targetIndex -= 1;
      continue;
    }
    if (
      !descriptor ||
      !target ||
      !isHtmlUnchangedTail(parent, descriptor, target, blockedSourceIds)
    ) {
      break;
    }
    matches[targetIndex] = descriptor;
    used.add(descriptor);
    childIndex -= 1;
    targetIndex -= 1;
  }
}
