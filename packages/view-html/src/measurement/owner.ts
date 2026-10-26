import type { HtmlDescriptor, HtmlNodeDesc, HtmlNodeViewDesc } from "../descriptors";

/**
 * Finds the semantic textblock shared by hit, caret and selection measurement.
 * @param descriptor - Starting retained owner.
 * @returns Enclosing textblock, or null for structural/opaque blocks.
 */
export function htmlTextblockOwner(descriptor: HtmlDescriptor | null | undefined): HtmlNodeDesc | HtmlNodeViewDesc | null {
  for (let current = descriptor; current; current = current.parent) {
    if ((current.kind === "node" || current.kind === "node-view") && current.node.isTextblock) return current;
  }
  return null;
}
