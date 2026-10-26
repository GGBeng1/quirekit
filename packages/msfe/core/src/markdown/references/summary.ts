import type { MarkdownReference } from "../types";
import type { ReferenceComparisonWork, ReferenceEquivalence, ReferenceSummary } from "./types";

const noChildren: readonly ReferenceSummary[] = Object.freeze([]);
export const emptyReferences: ReferenceSummary = Object.freeze({ size: 0, definition: null, children: noChildren });

/** @param definition - Immutable decoded fields. @returns One ordered definition leaf, independent of source coordinates. */
export function referenceLeaf(definition: MarkdownReference): ReferenceSummary {
  return Object.freeze({ size: 1, definition, children: noChildren });
}

/**
 * Transfers ownership of one freshly collected child array without copying descendant entries.
 * @param children - Nonempty child summaries in canonical source order, never mutated afterwards.
 * @param work - Counts newly retained child links, not copied definitions.
 * @returns A shared child or an immutable composite; unary levels are elided.
 */
export function combineReferences(children: ReferenceSummary[], work: { summaryLinks: number }): ReferenceSummary {
  if (!children.length) return emptyReferences;
  if (children.length === 1) return children[0]!;
  work.summaryLinks += children.length;
  return Object.freeze({ size: children.reduce((sum, child) => sum + child.size, 0), definition: null, children: Object.freeze(children) });
}

/** @param summary - Ordered immutable segments. @returns Definition values in source order, preserving duplicate precedence. */
export function* referenceEntries(summary: ReferenceSummary): Generator<MarkdownReference> {
  const pending = [summary];
  while (pending.length) {
    const next = pending.pop()!;
    if (next.definition) yield next.definition;
    else for (let index = next.children.length - 1; index >= 0; index--) pending.push(next.children[index]!);
  }
}

/**
 * Aligns ordered segments even when native balancing changes their grouping.
 * Identity is exact proof; mismatched leaves still compare every semantic field.
 * @param before - Previous confirmed summary.
 * @param after - New confirmed summary.
 * @param work - Actual segment and field comparisons.
 * @returns Exact ordered definition equivalence and independent label equivalence.
 */
export function compareReferences(before: ReferenceSummary, after: ReferenceSummary, work: ReferenceComparisonWork): ReferenceEquivalence {
  if (before.size !== after.size) return { entries: false, labels: false };
  const left = [before], right = [after];
  let entries = true, labels = true;
  // The two stacks cover the same remaining ordinal suffix. Expand larger
  // segments until their boundaries align; never use hashes or source proximity.
  while (left.length && right.length) {
    const a = left.at(-1)!, b = right.at(-1)!;
    work.summaryComparisons++;
    if (a === b) { left.pop(); right.pop(); work.reusedDefinitions += a.size; continue; }
    if (a.definition && b.definition) {
      left.pop(); right.pop(); work.definitionComparisons++;
      const x = a.definition, y = b.definition;
      labels &&= x.label === y.label;
      entries &&= x.label === y.label && x.url === y.url && x.title === y.title;
      if (!labels) return { entries: false, labels: false };
    } else {
      const pending = !a.definition && (b.definition || a.size >= b.size) ? left : right;
      const expanded = pending.pop()!;
      for (let index = expanded.children.length - 1; index >= 0; index--) pending.push(expanded.children[index]!);
    }
  }
  return { entries, labels };
}
