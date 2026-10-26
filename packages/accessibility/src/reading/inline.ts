import type { Node } from "@quirekit/pm";
import type { AccessibilityRegistry } from "../registry/types";
import type { ReadingInlineProjection, ReadingRun } from "./types";
import type { QuireAccessibilityLabels } from "../types";

/**
 * Projects bounded inline content without invoking DOM serialization hooks.
 * @param node - Canonical textblock.
 * @param from - Inclusive local content offset.
 * @param to - Exclusive local content offset.
 * @param registry - Node and mark semantics.
 * @param budget - Maximum displayed UTF-16 units, including object descriptions.
 * @param labels - Unknown object fallback.
 * @returns Bounded runs and an exact continuation outside inline objects.
 */
export function projectReadingRuns(node: Node, from: number, to: number, registry: AccessibilityRegistry,
  budget: number, labels: QuireAccessibilityLabels): ReadingInlineProjection {
  const runs: ReadingRun[] = [];
  let remaining = budget;
  let end = from;
  let hasObject = false;
  let stopped = false;
  node.nodesBetween(from, to, (child, position) => {
    if (stopped || remaining <= 0) return false;
    const description = child.isText ? null : registry.node(child);
    const lineBreak = description?.kind === "break" && child.nodeSize === 1;
    const start = Math.max(0, from - position);
    let text = child.isText ? child.text!.slice(start, Math.min(to - position, start + remaining))
      : lineBreak ? "\n" : ((description?.kind === "description" ? description.label : null)
        || labels.unsupported(child.type.name)).slice(0, remaining);
    if (/[\uD800-\uDBFF]$/u.test(text)) text = text.slice(0, -1);
    if (!child.isText && !text) text = "\uFFFC";
    // Objects consume their complete source node without descending, regardless of label length.
    if (child.isText && !text.length) { stopped = true; return false; }
    end = child.isText ? position + start + text.length : position + child.nodeSize;
    remaining -= text.length;
    hasObject ||= !child.isText && !lineBreak;
    runs.push({ text, marks: child.marks.flatMap((mark) => {
      const description = registry.mark(mark);
      return description ? [description] : [];
    }) });
    if (child.isText && end < Math.min(to, position + child.nodeSize)) stopped = true;
    return false;
  });
  return { runs, to: end, hasObject };
}
