import { DecorationSet, type DecorationSource } from "@quirekit/pm";
import type { HtmlContainerDesc } from "../descriptors";
import { htmlDescriptorContentRange } from "../reconcile/ownership/descriptor-tree";
import type { HtmlNodeViewEnvironment } from "./types";

/**
 * Finds the nearest retained container that represents a PM node.
 *
 * @param container - Possible mark or PM-node container.
 * @returns Nearest document, node, or NodeView container.
 */
export function findHtmlDecorationNodeContainer(
  container: HtmlContainerDesc
): Exclude<HtmlContainerDesc, { kind: "mark" | "inline-decoration" }> {
  let current: HtmlContainerDesc | null = container;

  while (current.kind === "mark" || current.kind === "inline-decoration") {
    current = current.parent;
    if (!current) {
      throw new RangeError("Retained mark decoration ownership requires a PM-node parent.");
    }
  }
  return current;
}

/**
 * Resolves the decoration source represented by one descriptor container.
 *
 * @param environment - Live root decoration authority.
 * @param container - Retained container whose PM-node content needs a source.
 * @returns Decoration source localized to the represented PM node.
 */
export function resolveHtmlContainerDecorationSource(
  environment: HtmlNodeViewEnvironment,
  container: HtmlContainerDesc
): DecorationSource {
  const nodes: Array<Extract<HtmlContainerDesc, { kind: "node" | "node-view" }>> = [];
  let current: HtmlContainerDesc | null = container;

  while (current && current.kind !== "document") {
    if (current.kind === "node" || current.kind === "node-view") {
      nodes.push(current);
    }
    current = current.parent;
  }
  let source = environment.getDecorations();

  for (const descriptor of nodes.reverse()) {
    const owner = descriptor.parent;

    if (!owner) {
      return DecorationSet.empty;
    }
    const offset = descriptor.range.from - htmlDescriptorContentRange(owner).from;

    source = source.forChild(offset, descriptor.node);
  }
  return source;
}
