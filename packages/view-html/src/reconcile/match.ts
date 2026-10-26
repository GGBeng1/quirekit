import type { HtmlContainerDesc, HtmlDescriptor } from "../descriptors";
import type {
  HtmlChildMatchResult,
  HtmlTargetDescriptor
} from "./types";
import { isHtmlStructuralMatchCompatible } from "./matching/matchable";
import { auditHtmlTargetSources } from "./matching/source";
import { findNearbyHtmlDescriptorMatch } from "./matching/nearby";
import {
  reserveHtmlExplicitSourceMatches,
  reserveHtmlUnchangedTail
} from "./matching/reserve";

export { isHtmlDescriptorCompatible } from "./matching/matchable";
export { htmlSiblingMatchLookahead } from "./matching/nearby";

/**
 * Matches desired children only within their retained parent.
 *
 * @param parent - Dirty parent that bounds every identity decision.
 * @param targets - Desired direct children in next-document order.
 * @returns Ordered matches plus children that must be removed.
 */
export function matchHtmlDescriptorChildren(
  parent: HtmlContainerDesc,
  targets: readonly HtmlTargetDescriptor[]
): HtmlChildMatchResult {
  const oldChildren = [...parent.children];
  const matches: (HtmlDescriptor | null)[] = targets.map(() => null);
  const used = new Set<HtmlDescriptor>();
  const sourceAudit = auditHtmlTargetSources(parent, targets);

  reserveHtmlExplicitSourceMatches(
    parent,
    oldChildren,
    targets,
    matches,
    used,
    sourceAudit.blockedSourceIds
  );
  // After explicit identity, reserve the unchanged mapped tail. This preserves
  // shifted suffixes without turning nearby matching into a parent-wide scan.
  reserveHtmlUnchangedTail(
    parent,
    oldChildren,
    targets,
    matches,
    used,
    sourceAudit.blockedSourceIds
  );

  let cursor = 0;
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    if (matches[targetIndex]) {
      continue;
    }
    const target = targets[targetIndex];
    while (cursor < oldChildren.length && used.has(oldChildren[cursor]!)) {
      cursor += 1;
    }
    const current = oldChildren[cursor];

    if (
      target &&
      current &&
      isHtmlStructuralMatchCompatible(
        parent,
        current,
        target,
        sourceAudit.blockedSourceIds
      )
    ) {
      matches[targetIndex] = current;
      used.add(current);
      cursor += 1;
      continue;
    }
    const nearby = target
      ? findNearbyHtmlDescriptorMatch(
          parent,
          oldChildren,
          target,
          cursor + 1,
          used,
          sourceAudit.blockedSourceIds
        )
      : null;

    if (nearby) {
      matches[targetIndex] = nearby;
      used.add(nearby);
    }
  }

  return {
    matches,
    removals: oldChildren.filter((descriptor) => !used.has(descriptor)),
    diagnostics: sourceAudit.diagnostics
  };
}
