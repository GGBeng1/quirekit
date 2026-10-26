import { readMindMapDocument } from "../model/document";
import type { MindMapDocument, MindMapNode, MindMapPoint } from "../model/types";
import { readMindMapClipboard } from "./codec";
import type { MindMapClipboard, MindMapPasteResult } from "./types";
import { mindMapAnnotationTopics, mindMapTopicIds } from "../annotations/references";

/** @param node - Source subtree. @returns Portable tree without parent-owned directions. */
function portable(node: MindMapNode): MindMapNode {
  const { side: _side, ...rest } = node;
  return { ...rest, children: node.children.map(portable) };
}

/**
 * Copies only topmost selected subtrees in document order, retaining folded content.
 * @param document - Source document.
 * @param ids - Selected identities, possibly overlapping.
 * @returns Validated portable forest, with no live source references.
 */
export function copyMindMapTopics(document: MindMapDocument, ids: readonly string[]): MindMapClipboard {
  const selected = new Set(ids), topics: MindMapNode[] = [];
  /** @param node - Current source node. */
  function visit(node: MindMapNode): void {
    if (selected.has(node.id)) topics.push(portable(node));
    else node.children.forEach(visit);
  }
  const source = readMindMapDocument(document);
  visit(source.root); source.floatingTopics?.forEach(topic => visit(topic.root));
  const included = mindMapTopicIds(topics);
  return readMindMapClipboard({ version: source.version >= 5 ? 4 : source.version >= 4 ? 3 : source.version === 3 ? 2 : 1, topics,
    ...(source.annotations ? { annotations: source.annotations.filter(item => mindMapAnnotationTopics(item).every(id => included.has(id))) } : {}) });
}

/**
 * Allocates every identity anew, then validates the complete result before publication.
 * @param document - Existing source; never mutated.
 * @param clipboard - Untrusted portable subtrees.
 * @param destination - Existing parent or world position relative to the main root.
 * @param createId - Host-independent identity allocator.
 * @returns Complete document and newly inserted topmost identities.
 */
export function pasteMindMapTopics(document: MindMapDocument, clipboard: MindMapClipboard,
  destination: string | MindMapPoint, createId: () => string): MindMapPasteResult {
  const original = readMindMapDocument(document), fragment = readMindMapClipboard(clipboard);
  const version = Math.max(original.version, fragment.version === 1 ? 1 : fragment.version + 1);
  const source = readMindMapDocument({ ...original, version,
    ...(version >= 2 ? { floatingTopics: original.floatingTopics ?? [] } : {}),
    ...(version >= 4 ? { annotations: original.annotations ?? [] } : {}) });
  const identities = new Map<string, string>();
  /** @param node - Portable subtree. @returns Copy with fresh identities. */
  function clone(node: MindMapNode): MindMapNode {
    const id = createId(); identities.set(node.id, id);
    return { ...node, id, children: node.children.map(clone) };
  }
  const topics = fragment.topics.map(clone);
  let candidate: MindMapDocument;
  if (typeof destination !== "string") {
    candidate = { ...source, version: Math.max(2, source.version) as MindMapDocument["version"], floatingTopics: [...(source.floatingTopics ?? []),
      ...topics.map((root, index) => ({ root, position: { x: destination.x, y: destination.y + index * 120 }, side: "right" as const }))] };
  } else {
    let found = false;
    /** @param node - Existing tree. @returns Tree with one expanded insertion parent. */
    function insert(node: MindMapNode): MindMapNode {
      if (node.id === destination) { found = true; return { ...node, collapsed: false, children: [...node.children, ...topics] }; }
      return { ...node, children: node.children.map(insert) };
    }
    candidate = { ...source, root: insert(source.root), ...(source.version !== 1 ? {
      floatingTopics: source.floatingTopics!.map(topic => ({ ...topic, root: insert(topic.root) })),
    } : {}) };
    if (!found) throw new TypeError("clipboard: paste target no longer exists");
  }
  if (fragment.annotations?.length) candidate = { ...candidate, annotations: [...(candidate.annotations ?? []),
    ...fragment.annotations.map(item => item.kind === "relation" ? { ...item, id: createId(), from: identities.get(item.from)!, to: identities.get(item.to)! }
      : { ...item, id: createId(), topicIds: item.topicIds.map(id => identities.get(id)!) })] };
  return { document: readMindMapDocument(candidate), ids: topics.map(node => node.id) };
}
