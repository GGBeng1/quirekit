import type { Node, ResolvedPos } from "@quirekit/pm";
import type { QuireAccessibilityOptions } from "../types";
import type { AccessibilityRegistry } from "../registry/types";
import { accessibilityDepthLimit, isContainerDescription, isTextDescription, supportsTextPosition } from "../registry/semantics";
import type { ReadingAncestor, ReadingItem, ReadingSegment } from "./types";
import { projectReadingRuns } from "./inline";

/**
 * Compiles a bounded canonical segment, retaining container ancestry at continuations.
 * @param doc - Canonical source, independent of realized visual pages.
 * @param cursor - Absolute continuation position from the preceding segment.
 * @param options - Text and item budgets.
 * @param registry - Compiled extension-owned semantic facts.
 * @returns Bounded leaves with exact source ancestry and continuation.
 */
export function projectReadingSegment(doc: Node, cursor: number, options: QuireAccessibilityOptions,
  registry: AccessibilityRegistry): ReadingSegment {
  let position = Math.max(0, Math.min(cursor, doc.content.size));
  let remaining = options.readingBudget;
  let visited = 0;
  const items: ReadingItem[] = [];
  const stepBudget = options.readingBlocks * accessibilityDepthLimit * 2;
  while (position < doc.content.size && items.length < options.readingBlocks && remaining > 0 && visited < stepBudget) {
    visited++;
    const resolved = doc.resolve(position);
    const insideText = resolved.parent.isTextblock;
    const node = insideText ? resolved.parent : resolved.nodeAfter;
    if (!node) { position++; continue; }
    const before = insideText ? resolved.before() : position;
    const description = registry.node(node);
    // Only contributed structures are traversed; depth and step limits also bound empty trees.
    if (!insideText && isContainerDescription(description) && !node.isAtom && node.childCount > 0
      && resolved.depth < accessibilityDepthLimit - 1) {
      position++;
      continue;
    }
    const ancestors = readAncestors(doc.resolve(before), registry);
    if (node.isTextblock && isTextDescription(description)) {
      const from = Math.max(before + 1, position);
      const end = before + node.nodeSize - 1;
      let to = Math.min(end, from + remaining);
      // Clip at a complete UTF-16 boundary before collecting marks and DOM runs.
      if (to < end && /^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(node.textBetween(to - before - 2, to - before, "", "\uFFFC"))) to--;
      if (to === from && from < end) return { doc, items, next: from, visited };
      const inline = projectReadingRuns(node, from - before - 1, to - before - 1, registry, remaining, options.labels);
      const runs = inline.runs;
      to = before + 1 + inline.to;
      const text = runs.map((run) => run.text).join("");
      const editable = supportsTextPosition(doc.resolve(from), registry) && !inline.hasObject;
      items.push({ from, to, text, runs, ancestors, description, continued: from > before + 1, editable });
      remaining -= Math.max(1, text.length);
      if (to < end) return { doc, items, next: to, visited };
    } else {
      const leaf = description?.kind === "description" || description?.kind === "separator" ? description
        : { kind: "description" as const, label: options.labels.unsupported(node.type.name) };
      let text = (leaf.label ?? (leaf.kind === "separator" ? "" : options.labels.unsupported(node.type.name))).slice(0, remaining);
      if (/[\uD800-\uDBFF]$/u.test(text)) text = text.slice(0, -1);
      items.push({ from: before, to: before + node.nodeSize, text, runs: [], ancestors,
        description: { ...leaf, ...(leaf.label === undefined ? {} : { label: text }) }, continued: false, editable: false });
      remaining -= Math.max(1, text.length);
    }
    position = before + node.nodeSize;
  }
  // Closing tokens contain no content; the last segment needs no empty successor.
  while (position < doc.content.size && doc.resolve(position).nodeAfter === null) position++;
  return { doc, items, next: position < doc.content.size ? position : null, visited };
}

/** @param position - Position before the leaf. @param registry - Semantic owners. @returns Bounded native structural ancestry. */
function readAncestors(position: ResolvedPos, registry: AccessibilityRegistry): readonly ReadingAncestor[] {
  const ancestors: ReadingAncestor[] = [];
  for (let depth = 1; depth <= Math.min(position.depth, accessibilityDepthLimit); depth++) {
    const description = registry.node(position.node(depth));
    if (!isContainerDescription(description)) break;
    ancestors.push({ from: position.before(depth), description,
      index: position.index(depth - 1) + 1, total: position.node(depth - 1).childCount });
  }
  return ancestors;
}
