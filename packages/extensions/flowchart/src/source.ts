import type { Node } from "@quirekit/pm";
import { readFlowchartEmbed, type FlowchartEmbed, flowchartPreviewSource } from "@quirekit/flowchart";
const cache = new WeakMap<Node, FlowchartEmbed | null>();
/** @param node - Immutable PM node. @returns Once-validated source, or an explicit invalid-content fallback. */
export function readFlowchartNode(node: Node): FlowchartEmbed | null {
  if (cache.has(node)) return cache.get(node)!;
  let value: FlowchartEmbed | null = null;
  try { value = readFlowchartEmbed(node.attrs.flow); } catch { /* Invalid imports stay visible, never become an empty editable flow. */ }
  cache.set(node, value); return value;
}
/** @param value - Plain string or validated data URL. @returns Safe attribute/text content. */
export function escapeFlowchartHtml(value: string): string {
  return value.replace(/[&<>"']/gu, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
/** @param document - Validated content. @returns Inert, self-contained preview markup. */
export function flowchartPreviewHtml(document: FlowchartEmbed | null): string {
  if (!document) return '<div style="padding:24px;color:#64748b">流程图数据无效，原始数据已保留</div>';
  if (!document.preview) return '<div style="display:grid;place-items:center;width:100%;height:100%;color:#64748b;background:#f8fafc">双击打开流程图</div>';
  return `<img alt="${escapeFlowchartHtml(document.title)}" src="${escapeFlowchartHtml(flowchartPreviewSource(document)!)}" draggable="false" style="display:block;width:100%;height:100%;object-fit:contain;pointer-events:none" />`;
}
