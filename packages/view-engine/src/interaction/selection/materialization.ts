import type { QuireSelectionMaterializationNode, QuireSelectionMaterializationOptions } from "./types";
import { readQuireSubLayoutFragments } from "../../layout/engine/sub-layout/snapshot/fragments";

/**
 * Reports whether current input needs its active textblock materialized.
 *
 * A non-empty range must prove its head, not merely overlap its already-painted
 * anchor. The same check therefore serves collapsed and directional selections.
 *
 * @param options - Retained geometry and current selection.
 * @returns Whether the active textblock lacks measured fragments.
 */
export function shouldMaterializeQuireSelectionTextblock(
  options: QuireSelectionMaterializationOptions
): boolean {
  const head = options.selection.$head;
  if (head.parent.isTextblock && head.depth > 0) {
    const from = head.before(head.depth);
    return !hasTextFragmentsInRange(options.snapshot.root, {
      from,
      to: from + head.parent.nodeSize
    });
  }
  if (options.selection.empty !== false) return false;
  let containsTextblock = false;
  options.selection.$from.doc.nodesBetween(options.selection.from, options.selection.to, (node) => {
    containsTextblock ||= node.isTextblock;
    return !containsTextblock;
  });
  return containsTextblock && !hasTextFragmentsInRange(options.snapshot.root, options.selection);
}

/**
 * Searches only overlapping retained subtrees for exact text geometry.
 *
 * @param node - Current retained subtree.
 * @param range - Source textblock containing the active head.
 * @returns Whether measured fragments belong to the requested textblock.
 */
function hasTextFragmentsInRange(node: QuireSelectionMaterializationNode, range: QuireSelectionMaterializationNode["range"]): boolean {
  if (node.range.from >= range.to || node.range.to <= range.from) {
    return false;
  }
  if (node.textFragments?.some((fragment) =>
    fragment.range.from >= range.from && fragment.range.to <= range.to
  ) === true) return true;
  const children = node.children ?? [];
  if (children.length > 0) {
    return children.some((child) => hasTextFragmentsInRange(child, range));
  }
  // Provider-only flows keep measured boxes in fragment provenance. Query ranges
  // or owner bounds alone do not prove text measurement; visit the actual boxes.
  return readQuireSubLayoutFragments(node).some((fragment) =>
    fragment.subLayout.view.fragmentSources.some((source) =>
      hasTextFragmentsInRange(source.sourceBox, range)
    )
  );
}
