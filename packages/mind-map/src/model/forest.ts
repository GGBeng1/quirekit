import { readMindMapDocument } from "./document";
import type { MindMapDocument, MindMapNode, MindMapPoint } from "./types";
import { mindMapTopicIds, retainMindMapAnnotations } from "../annotations/references";

/** @param node - Subtree. @param id - Identity to find. @returns Matching descendant including the root. */
function find(node: MindMapNode, id: string): MindMapNode | undefined {
  return node.id === id ? node : node.children.map(child => find(child, id)).find(Boolean);
}

/** @param node - Moved subtree. @returns A tree whose new owner determines branch direction. */
function clearSides(node: MindMapNode): MindMapNode {
  const { side: _side, ...rest } = node;
  return { ...rest, children: node.children.map(clearSides) };
}

/**
 * Removes selected subtrees atomically, preserving the main root and surviving order.
 * @param document - Validated source.
 * @param ids - Selection; ancestor/descendant pairs are removed only once.
 * @returns Validated independent document.
 */
export function removeMindMapTopics(document: MindMapDocument, ids: readonly string[]): MindMapDocument {
  const removed = new Set(ids); removed.delete(document.root.id);
  /** @param node - Surviving node. @returns Node with selected descendants pruned. */
  function prune(node: MindMapNode): MindMapNode {
    return { ...node, children: node.children.filter(child => !removed.has(child.id)).map(prune) };
  }
  let root = prune(document.root);
  // Auto sides derive from original sibling order. Removing a branch must not
  // reassign every surviving branch to the opposite side of the main root.
  if (document.layout === "mind-map" && root.children.length !== document.root.children.length) {
    const sides = new Map(document.root.children.map((node, index) => [node.id, node.side ?? (index % 2 === 0 ? "right" : "left")] as const));
    root = { ...root, children: root.children.map(node => ({ ...node, side: sides.get(node.id)! })) };
  }
  const floatingTopics = (document.floatingTopics ?? []).filter(topic => !removed.has(topic.root.id))
    .map(topic => ({ ...topic, root: prune(topic.root) }));
  return readMindMapDocument({ ...document, root,
    ...(document.version !== 1 ? { floatingTopics } : {}),
    ...(document.annotations ? { annotations: retainMindMapAnnotations(document.annotations,
      mindMapTopicIds([root, ...floatingTopics.map(topic => topic.root)])) } : {}) });
}

/**
 * Moves a complete subtree into a parent or into an independent positioned tree.
 * @param document - Validated source.
 * @param id - Subtree identity; the main root cannot move structurally.
 * @param destination - Parent identity, or free position relative to the main root.
 * @param side - Growth direction when detaching.
 * @returns Atomic validated change retaining all descendant identities and text.
 */
export function moveMindMapTopic(document: MindMapDocument, id: string, destination: string | MindMapPoint,
  side: "left" | "right" = "right"): MindMapDocument {
  const roots = [document.root, ...(document.floatingTopics ?? []).map(topic => topic.root)];
  const node = roots.map(root => find(root, id)).find(Boolean);
  if (!node || id === document.root.id) throw new TypeError("Cannot move missing topic or main root");
  if (typeof destination === "string" && (find(node, destination) || !roots.some(root => find(root, destination)))) {
    throw new TypeError("Cannot attach topic to itself, a descendant or a missing parent");
  }
  const remaining = removeMindMapTopics(document, [id]);
  // Deletion temporarily prunes references; a move restores them only after its
  // complete subtree has a new owner, so neither intermediate forest can leak.
  const annotations = document.annotations ? { annotations: document.annotations } : {};
  const moved = clearSides(node);
  if (typeof destination !== "string") {
    return readMindMapDocument({ ...remaining, ...annotations, version: Math.max(2, remaining.version),
      floatingTopics: [...(remaining.floatingTopics ?? []), { root: moved, position: destination, side }] });
  }
  /** @param root - Candidate parent tree. @returns Tree with the moved child appended once. */
  function attach(root: MindMapNode): MindMapNode {
    return root.id === destination ? { ...root, collapsed: false, children: [...root.children, moved] }
      : { ...root, children: root.children.map(attach) };
  }
  return readMindMapDocument({ ...remaining, ...annotations, root: attach(remaining.root),
    ...(remaining.version !== 1 ? { floatingTopics: remaining.floatingTopics!.map(topic => ({ ...topic, root: attach(topic.root) })) } : {}) });
}

/**
 * Creates a portable independent topic without modifying existing trees.
 * @param document - Validated source.
 * @param id - New globally unique identity.
 * @param position - Position relative to the main root.
 * @param text - Explicit initial title; existing topics are never rewritten.
 * @returns Version 2 document with one additional free topic.
 */
export function addMindMapFloatingTopic(document: MindMapDocument, id: string, position: MindMapPoint, text = "自由主题"): MindMapDocument {
  return readMindMapDocument({ ...document, version: Math.max(2, document.version), floatingTopics: [...(document.floatingTopics ?? []), {
    root: { id, text, collapsed: false, children: [] }, position, side: "right",
  }] });
}
