import { resolveWordNamedParagraphStyle } from "./resolve";
import type { WordParagraphStyleRegistry } from "./types";

/**
 * Collects numbering instances and levels that styles apply to their paragraphs.
 *
 * Numbering import keeps only referenced instances, so style-only references must
 * be reported alongside direct paragraph references.
 *
 * @param registry - Valid document named paragraph style registry.
 * @returns Concrete numbering ids mapped to the levels styles resolve to.
 */
export function collectWordStyleNumberingReferences(
  registry: WordParagraphStyleRegistry
): ReadonlyMap<string, ReadonlySet<number>> {
  const references = new Map<string, Set<number>>();
  for (const styleId of Object.keys(registry.styles)) {
    const numbering = resolveWordNamedParagraphStyle(registry, styleId).numbering;
    if (numbering === null) continue;
    const levels = references.get(numbering.numId) ?? new Set<number>();
    levels.add(numbering.level);
    references.set(numbering.numId, levels);
  }
  return references;
}
