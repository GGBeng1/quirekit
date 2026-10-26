import { mindEditorTranslator } from "../locale/resolve";
import type { MindEditorTranslate } from "../locale/types";
import type { QuireKitTreeNode } from "@quirekit/ui";
import type { MindMapOutlineEntry } from "@quirekit/mind-map-simple";

/** @param entries - Captured preorder index. @param t - Scoped workspace translator. @returns Public tree nodes for the shared TreeView. */
export function mindEditorOutlineNodes(entries: readonly MindMapOutlineEntry[], t: MindEditorTranslate = mindEditorTranslator()): readonly QuireKitTreeNode[] {
  const nodes = new Map<string, { id: string; label: string; children?: QuireKitTreeNode[] }>();
  const roots: QuireKitTreeNode[] = [];
  for (const entry of entries) {
    const node = { id: entry.id, label: `${entry.text || t("emptyTopic")}${entry.parentId === null && entry.free && entry.text !== t("floatingTopic") ? ` · ${t("floatingTopic")}` : ""}` };
    nodes.set(entry.id, node);
    if (entry.parentId) { const parent = nodes.get(entry.parentId); if (parent) (parent.children ??= []).push(node); }
    else roots.push(node);
  }
  return roots;
}
/** @param entries - Cached literal topic text. @param query - Untrusted literal search text. @returns Matching entries, including hidden topics. */
export function findMindEditorTopics(entries: readonly MindMapOutlineEntry[], query: string): readonly MindMapOutlineEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return needle ? entries.filter(entry => entry.text.toLocaleLowerCase().includes(needle)) : [];
}
