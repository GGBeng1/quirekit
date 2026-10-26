import type { HtmlContainerDesc, HtmlDescriptor } from "../../descriptors";
import type { HtmlTargetDescriptor } from "../types";
import type { HtmlTargetSourceAudit } from "./types";

/**
 * Collects uniquely owned explicit source identities from retained children.
 *
 * @param parent - Parent whose inherited source is not direct child identity.
 * @param children - Existing direct retained children.
 * @returns Lookup containing only source ids owned by exactly one child.
 */
export function collectDistinctHtmlSourceMatches(
  parent: HtmlContainerDesc,
  children: readonly HtmlDescriptor[]
): Map<string, HtmlDescriptor> {
  const matches = new Map<string, HtmlDescriptor>();
  const duplicates = new Set<string>();

  for (const child of children) {
    const sourceId = child.source.sourceId;

    if (sourceId === parent.source.sourceId) {
      continue;
    }
    if (matches.has(sourceId)) {
      matches.delete(sourceId);
      duplicates.add(sourceId);
    } else if (!duplicates.has(sourceId)) {
      matches.set(sourceId, child);
    }
  }
  return matches;
}

/**
 * Finds duplicate explicit source claims in the desired direct children.
 *
 * @param parent - Parent whose inherited source is excluded from identity.
 * @param targets - Desired direct children in canonical order.
 * @returns Blocked source ids and one stable diagnostic per duplicate id.
 */
export function auditHtmlTargetSources(
  parent: HtmlContainerDesc,
  targets: readonly HtmlTargetDescriptor[]
): HtmlTargetSourceAudit {
  const counts = new Map<string, number>();

  for (const target of targets) {
    const sourceId = target.source.sourceId;

    if (sourceId !== parent.source.sourceId) {
      counts.set(sourceId, (counts.get(sourceId) ?? 0) + 1);
    }
  }
  const blockedSourceIds = new Set(
    [...counts]
      .filter(([, count]) => count > 1)
      .map(([sourceId]) => sourceId)
      .sort()
  );

  return {
    blockedSourceIds,
    diagnostics: [...blockedSourceIds].map((sourceId) => ({
      code: "html-source-identity-duplicate",
      descriptorId: parent.id,
      typeName: "source",
      message: `Duplicate explicit HTML source identity "${sourceId}" under "${parent.id}".`
    }))
  };
}
