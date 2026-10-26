import type { Node } from "@quirekit/pm";
import { readMindMapEmbed, type MindMapEmbed, mindMapPreviewSource } from "@quirekit/mind-map";
const cache = new WeakMap<Node, MindMapEmbed | null>();
/** @param node - Immutable PM node. @returns Once-validated source, or an explicit invalid-content fallback. */
export function readMindMapNode(node: Node): MindMapEmbed | null {
  if (cache.has(node)) return cache.get(node)!;
  let value: MindMapEmbed | null = null;
  try { value = readMindMapEmbed(node.attrs.mind); } catch { /* Invalid imports stay visible, never become an empty editable mind. */ }
  cache.set(node, value); return value;
}
/** @param value - Plain string or validated data URL. @returns Safe attribute/text content. */
export function escapeMindMapHtml(value: string): string {
  return value.replace(/[&<>"']/gu, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
/** @param document - Validated content. @returns Inert, self-contained preview markup. */
export function mindMapPreviewHtml(document: MindMapEmbed | null): string {
  if (!document) return '<div style="padding:24px;color:#64748b">思维导图数据无效，原始数据已保留</div>';
  if (!document.preview) return '<div style="display:grid;place-items:center;width:100%;height:100%;color:#64748b;background:#f8fafc">双击打开思维导图</div>';
  return `<img alt="${escapeMindMapHtml(document.title)}" src="${escapeMindMapHtml(mindMapPreviewSource(document)!)}" draggable="false" style="display:block;width:100%;height:100%;object-fit:contain;pointer-events:none" />`;
}
