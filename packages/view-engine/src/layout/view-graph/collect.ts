import type {
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type { QuireLayoutNode } from "../types";
import type { QuireLayoutViewGraphNodeEntry } from "./types";

/**
 * Collects layout nodes in stable tree order.
 *
 * @param node - Current layout node.
 * @param depth - Current node depth.
 * @returns Layout node entries in preorder.
 */
export function collectLayoutViewGraphNodeEntries(
  node: QuireLayoutNode,
  depth = 0
): readonly QuireLayoutViewGraphNodeEntry[] {
  return [
    { node, depth },
    ...(node.children ?? []).flatMap((child) =>
      collectLayoutViewGraphNodeEntries(child, depth + 1)
    )
  ];
}

/**
 * Collects explicit view roots carried by layout nodes.
 *
 * @param entries - Layout node entries to inspect.
 * @param productRoots - Exact roots compiled by retained product producers.
 * @returns Roots in first-seen order.
 */
export function collectLayoutViewGraphRoots(
  entries: readonly QuireLayoutViewGraphNodeEntry[],
  productRoots: readonly QuireLayoutRoot[]
): readonly QuireLayoutRoot[] {
  const roots = new Map<string, QuireLayoutRoot>();

  for (const { node } of entries) {
    if (node.viewRoot === undefined || roots.has(node.viewRoot.id.value)) {
      continue;
    }

    roots.set(node.viewRoot.id.value, node.viewRoot);
  }

  for (const root of productRoots) {
    if (!roots.has(root.id.value)) {
      roots.set(root.id.value, root);
    }
  }

  return [...roots.values()];
}
