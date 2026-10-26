import type { Node } from "@quirekit/pm";
import { readTextDiagram, type TextDiagramEmbed } from "@quirekit/text-diagram";
const cache = new WeakMap<Node, TextDiagramEmbed | null>();
/** @param node - Immutable PM node. @returns Once-validated source, or an explicit invalid-content fallback. */
export function readTextDiagramNode(node: Node): TextDiagramEmbed | null {
  if (cache.has(node)) return cache.get(node)!;
  let value: TextDiagramEmbed | null = null;
  try { value = readTextDiagram(node.attrs.diagram); } catch { /* Invalid imports stay visible, never become an empty editable diagram. */ }
  cache.set(node, value); return value;
}
/** @param value - Plain string or validated data URL. @returns Safe attribute/text content. */
export function escapeTextDiagramHtml(value: string): string {
  return value.replace(/[&<>"']/gu, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
/** @param document - Validated content. @returns Inert, self-contained preview markup. */
export function textDiagramPreviewHtml(document: TextDiagramEmbed | null): string {
  if (!document) return '<div style="padding:24px;color:#64748b">文本绘图数据无效，原始源码已保留</div>';
  if (!document.preview) return '<div style="display:grid;place-items:center;width:100%;height:100%;color:#64748b;background:#f8fafc">双击打开文本绘图</div>';
  return `<img alt="${escapeTextDiagramHtml(document.title)}" src="${document.preview.dataUrl}" draggable="false" style="display:block;width:100%;height:100%;object-fit:contain;pointer-events:none" />`;
}
