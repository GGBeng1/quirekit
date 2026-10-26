import type { QuireAiBlockItem, QuireAiCapability } from "@quirekit/ai-contract";
import type { MindMapEmbed, MindMapNode } from "@quirekit/mind-map";
import { readMindMapNode } from "../source";

const cache = new WeakMap<MindMapEmbed, readonly QuireAiBlockItem[]>();

/** The topic tree, never the PNG, explains the mind map to the model. */
export const mindMapAiCapabilities: readonly QuireAiCapability[] = [{
  kind: "block", node: "mindMap",
  /** @param node - Mind map atom. @returns Bounded topic summary. */
  label(node) {
    const mind = readMindMapNode(node);
    return mind ? mindMapAiLabel(mind) : "思维导图：源数据无效";
  },
  /** @param node - Mind map atom. @returns Every topic and annotation. */
  items(node) {
    const mind = readMindMapNode(node);
    return mind ? mindMapAiItems(mind) : [];
  }
}];

/**
 * @param mind - Validated mind map, wherever the document stores it.
 * @returns Summary with the first 40 topics in reading order.
 */
export function mindMapAiLabel(mind: MindMapEmbed): string {
  const items = mindMapAiItems(mind);
  const elements = items.slice(0, 40).map(item => ({ id: item.id, ...item.properties, ...(item.label ? { label: item.label.slice(0, 160) } : {}) }));
  return `思维导图 ${JSON.stringify({ id: mind.id, revision: mind.document.revision, title: mind.title, layout: mind.document.layout, total: items.length, elements })}`;
}

/**
 * @param mind - Validated mind map, wherever the document stores it.
 * @returns Topics depth-first from the root, then floating topics, then relations and groups.
 */
export function mindMapAiItems(mind: MindMapEmbed): readonly QuireAiBlockItem[] {
  const cached = cache.get(mind);
  if (cached) return cached;
  const items: QuireAiBlockItem[] = [];
  // Depth-first order matches the outline a reader follows.
  const visit = (topic: MindMapNode, parent: string | null, depth: number, kind: string): void => {
    const details = topic.details;
    items.push({ id: topic.id, label: topic.text, properties: {
      kind, parent, depth, ...(topic.collapsed ? { collapsed: true } : {}),
      ...(details?.marker ? { marker: details.marker } : {}), ...(details?.link ? { link: details.link } : {}), ...(details?.note ? { note: details.note } : {})
    } });
    for (const child of topic.children) visit(child, topic.id, depth + 1, "topic");
  };
  visit(mind.document.root, null, 0, "root");
  for (const floating of mind.document.floatingTopics ?? []) visit(floating.root, null, 0, "floating");
  for (const annotation of mind.document.annotations ?? []) {
    items.push({ id: annotation.id, ...(annotation.text ? { label: annotation.text } : {}), properties: annotation.kind === "relation"
      ? { kind: "relation", from: annotation.from, to: annotation.to }
      : { kind: annotation.kind, topics: annotation.topicIds.join(",") } });
  }
  cache.set(mind, items);
  return items;
}
