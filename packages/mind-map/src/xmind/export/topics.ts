import type { MindMapNode } from "../../model/types";
import { reportXmind } from "../reading";
import type { XmindExportContext, XmindExportTopic } from "./types";
import { xmindStyle } from "./style";

/** @param source - Checked base64 PNG. @returns Detached PNG bytes without DOM globals. */
function pngBytes(source: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", text = source.slice(22).replace(/=+$/u, "");
  const bytes = new Uint8Array(Math.floor(text.length * 6 / 8)); let buffer = 0, bits = 0, offset = 0;
  for (const character of text) { buffer = (buffer << 6) | alphabet.indexOf(character); bits += 6;
    if (bits >= 8) { bits -= 8; bytes[offset++] = (buffer >>> bits) & 255; } }
  return bytes;
}

/** @param root - Tree root. @param context - Workbook resources and differences. @param path - Export location. @param topics - Complete reference index. @param parent - Attached sibling owner. @param index - Sibling position. @returns Modern topic record retaining portable content. */
export function exportXmindTopic(root: MindMapNode, context: XmindExportContext, path: string, topics: Map<string, XmindExportTopic>, parent?: XmindExportTopic, index = 0): Record<string, unknown> {
  if (++context.report.count > 10000) throw new RangeError("XMind: workbook topic budget exceeded");
  const output: Record<string, unknown> = { id: root.id, title: root.text }, item: XmindExportTopic = { node: root, output, ...(parent ? { parent } : {}), index };
  topics.set(root.id, item);
  if (root.collapsed) output.branch = "folded";
  if (root.style) output.style = xmindStyle(root.style);
  if (root.side !== undefined) reportXmind(context.report, "fallback", `${path}.side`, "Explicit per-branch direction is replaced by the XMind structure's automatic arrangement.");
  const details = root.details;
  if (details?.note !== undefined) output.notes = { plain: { content: details.note } };
  if (details?.link !== undefined) output.href = details.link;
  if (details?.marker !== undefined) output.markers = [{ markerId: details.marker }];
  if (details?.image) {
    const image = details.image; let name = context.images.get(image.dataUrl);
    if (!name) { name = `resources/image-${context.images.size + 1}.png`; context.images.set(image.dataUrl, name); context.resources.set(name, pngBytes(image.dataUrl)); }
    output.image = { src: `xap:${name}`, width: image.width, height: image.height };
    if (image.alt) reportXmind(context.report, "unsupported-field", `${path}.details.image.alt`, "XMind topic images do not carry the portable alternative-text field.");
  }
  if (root.children.length) output.children = { attached: root.children.map((child, i) => exportXmindTopic(child, context, `${path}.children[${i}]`, topics, item, i)) };
  return output;
}
