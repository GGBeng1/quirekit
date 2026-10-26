import type { Node } from "@quirekit/pm";
import { readWhiteboardDocument, whiteboardPreviewMessages, type WhiteboardDocument, whiteboardPreviewSource } from "@quirekit/whiteboard";
const cache = new WeakMap<Node, WhiteboardDocument | null>();
/** @param node - Immutable PM node. @returns Once-validated source, or an explicit invalid-content fallback. */
export function readWhiteboardNode(node: Node): WhiteboardDocument | null {
  if (cache.has(node)) return cache.get(node)!;
  let value: WhiteboardDocument | null = null;
  try { value = readWhiteboardDocument(node.attrs.board); } catch { /* Invalid imports stay visible, never become an empty editable board. */ }
  cache.set(node, value); return value;
}
/** @param value - Plain string or validated data URL. @returns Safe attribute/text content. */
export function escapeWhiteboardHtml(value: string): string {
  return value.replace(/[&<>"']/gu, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
/** @param document - Validated content. @param locale - Mounted host interface language. @returns Inert, self-contained preview markup. */
export function whiteboardPreviewHtml(document: WhiteboardDocument | null, locale = "zh-CN"): string {
  const text = whiteboardPreviewMessages(locale);
  if (!document) return `<div style="padding:24px;color:#64748b">${text.invalid}</div>`;
  if (!document.preview) return `<div style="display:grid;place-items:center;width:100%;height:100%;color:#64748b;background:#f8fafc">${text.open}</div>`;
  return `<img alt="${escapeWhiteboardHtml(document.title)}" src="${escapeWhiteboardHtml(whiteboardPreviewSource(document)!)}" draggable="false" style="display:block;width:100%;height:100%;object-fit:contain;pointer-events:none" />`;
}
