import { setMindMapTopicDetails } from "../details/operations";
import type { MindMapDetailsPatch } from "../details/types";
import { readMindMapDocument } from "../model/document";
import { moveMindMapTopic, removeMindMapTopics } from "../model/forest";
import { setMindMapLayout } from "../model/layout";
import type { MindMapDocument, MindMapNode } from "../model/types";
import type { MindMapDiagramPatch, MindMapDiagramTopicPatch } from "./types";

/**
 * Applies an Agent edit to a mind map, keeping its revision.
 *
 * Deletions run first, then topic changes in order, so a topic created earlier in the same edit
 * can parent later ones; the layout applies last.
 *
 * @param document - Current mind map.
 * @param patch - Schema-valid Agent edit.
 * @returns Validated next mind map with the same revision.
 * @throws Error naming the topic that cannot change.
 */
export function editMindMapDiagram(document: MindMapDocument, patch: MindMapDiagramPatch): MindMapDocument {
  let map = readMindMapDocument(document);
  if (patch.remove?.length) {
    const missing = patch.remove.filter(id => !findTopic(map, id));
    if (missing.length) throw new Error(`要删除的主题不存在：${missing.join("、")}`);
    if (patch.remove.includes(map.root.id)) throw new Error("中心主题不能删除");
    map = removeMindMapTopics(map, patch.remove);
  }
  for (const topic of patch.topics ?? []) map = putTopic(map, topic);
  return patch.layout ? setMindMapLayout(map, patch.layout) : map;
}

/**
 * @param map - Current mind map.
 * @param patch - Topic to create or change.
 * @returns Mind map with the topic in place.
 */
function putTopic(map: MindMapDocument, patch: MindMapDiagramTopicPatch): MindMapDocument {
  const existing = findTopic(map, patch.id);
  if (!existing) {
    if (patch.parent === undefined) throw new Error(`新主题 ${patch.id} 需要 parent`);
    if (!findTopic(map, patch.parent)) throw new Error(`主题 ${patch.id} 的父主题不存在：${patch.parent}`);
    map = mapTopics(map, node => node.id !== patch.parent ? node
      : { ...node, collapsed: false, children: insert(node.children, { id: patch.id, text: patch.text ?? "", collapsed: patch.collapsed ?? false, children: [] }, patch.index) });
  } else {
    if (patch.parent !== undefined && patch.parent !== parentOf(map, patch.id)?.id) {
      if (patch.id === map.root.id) throw new Error("中心主题不能移动");
      map = moveMindMapTopic(map, patch.id, patch.parent);
    }
    if (patch.index !== undefined) {
      const parent = parentOf(map, patch.id);
      if (!parent) throw new Error(`主题 ${patch.id} 没有父主题，不能调整顺序`);
      map = mapTopics(map, node => node.id !== parent.id ? node
        : { ...node, children: insert(node.children.filter(child => child.id !== patch.id), node.children.find(child => child.id === patch.id)!, patch.index) });
    }
    if (patch.text !== undefined || patch.collapsed !== undefined) {
      map = mapTopics(map, node => node.id !== patch.id ? node
        : { ...node, ...(patch.text === undefined ? {} : { text: patch.text }), ...(patch.collapsed === undefined ? {} : { collapsed: patch.collapsed }) });
    }
  }
  const details = Object.fromEntries((["note", "link", "marker"] as const).filter(key => patch[key] !== undefined).map(key => [key, patch[key]]));
  return Object.keys(details).length ? setMindMapTopicDetails(map, [patch.id], details as MindMapDetailsPatch) : readMindMapDocument(map);
}

/** @param children - Siblings. @param child - Topic to place. @param index - Requested position. @returns Siblings with the topic placed. */
function insert(children: readonly MindMapNode[], child: MindMapNode, index = children.length): MindMapNode[] {
  const at = Math.max(0, Math.min(index, children.length));
  return [...children.slice(0, at), child, ...children.slice(at)];
}

/** @param map - Mind map. @param change - Rewrites one topic. @returns Mind map with every tree rewritten. */
function mapTopics(map: MindMapDocument, change: (node: MindMapNode) => MindMapNode): MindMapDocument {
  const visit = (node: MindMapNode): MindMapNode => {
    const next = change(node);
    return { ...next, children: next.children.map(visit) };
  };
  return readMindMapDocument({ ...map, root: visit(map.root),
    ...(map.floatingTopics ? { floatingTopics: map.floatingTopics.map(topic => ({ ...topic, root: visit(topic.root) })) } : {}) });
}

/** @param map - Mind map. @returns Every tree root, main first. */
function roots(map: MindMapDocument): readonly MindMapNode[] {
  return [map.root, ...(map.floatingTopics ?? []).map(topic => topic.root)];
}

/** @param map - Mind map. @param id - Topic id. @returns The topic, or undefined. */
function findTopic(map: MindMapDocument, id: string): MindMapNode | undefined {
  const search = (node: MindMapNode): MindMapNode | undefined => node.id === id ? node : node.children.map(search).find(Boolean);
  return roots(map).map(search).find(Boolean);
}

/** @param map - Mind map. @param id - Topic id. @returns Its parent topic, or undefined for a tree root. */
function parentOf(map: MindMapDocument, id: string): MindMapNode | undefined {
  const search = (node: MindMapNode): MindMapNode | undefined => node.children.some(child => child.id === id) ? node : node.children.map(search).find(Boolean);
  return roots(map).map(search).find(Boolean);
}
