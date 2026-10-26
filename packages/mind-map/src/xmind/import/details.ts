import { readMindMapDetails } from "../../details/validation";
import type { MindMapTopicDetails } from "../../details/types";
import type { XmindCanvas, XmindContext } from "../types";
import { reportXmind, reportXmindFields, xmindArray, xmindRecord } from "../reading";

/** @param path - Resource reference. @returns A permitted archive-local resource name. */
export function xmindResourcePath(path: unknown): string | undefined {
  if (typeof path !== "string" || !path.startsWith("xap:resources/")) return undefined;
  const relative = path.slice(4);
  return /[\\\u0000-\u001f\u007f]/u.test(relative) || relative.split("/").some(part => !part || part === "." || part === "..") ? undefined : relative;
}

/** @param bytes - Bounded PNG. @returns Portable base64 with no browser globals. */
export function xmindImageData(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"; let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const value = bytes[i]! * 65536 + (bytes[i + 1] ?? 0) * 256 + (bytes[i + 2] ?? 0);
    result += alphabet[(value >>> 18) & 63]! + alphabet[(value >>> 12) & 63]! + (i + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : "=") + (i + 2 < bytes.length ? alphabet[value & 63] : "=");
  }
  return `data:image/png;base64,${result}`;
}

/** @param topic - Source topic. @param path - Field location. @param context - Difference budget. @param canvas - Resource ownership. @returns Admitted content without fetching external URLs. */
export function readXmindDetails(topic: Record<string, unknown>, path: string, context: XmindContext, canvas: XmindCanvas): MindMapTopicDetails {
  const result: Record<string, unknown> = {};
  /** @param field - Target content field. @param value - Untrusted field. @param source - Source location. */
  function admit(field: string, value: unknown, source: string): void {
    try { Object.assign(result, readMindMapDetails({ [field]: value })); }
    catch { reportXmind(context, "unsupported-field", source, "Content is outside the admitted topic contract."); }
  }
  if (topic.href !== undefined) admit("link", topic.href, `${path}.href`);
  if (topic.notes !== undefined) {
    const notes = xmindRecord(topic.notes, `${path}.notes`);
    reportXmindFields(notes, ["plain", "html", "ops"], `${path}.notes`, context);
    if (notes.plain !== undefined) {
      const plain = xmindRecord(notes.plain, `${path}.notes.plain`); reportXmindFields(plain, ["content"], `${path}.notes.plain`, context);
      admit("note", plain.content, `${path}.notes.plain.content`);
    } else if (notes.html !== undefined && typeof notes.html === "object" && notes.html !== null) {
      const html = xmindRecord(notes.html, `${path}.notes.html`), content = xmindRecord(html.content, `${path}.notes.html.content`);
      const paragraphs = xmindArray(content.paragraphs, `${path}.notes.html.content.paragraphs`);
      const text = paragraphs.map(p => xmindArray(xmindRecord(p, "paragraph").spans, "spans").map(span => {
        const value = xmindRecord(span, "span").text; return typeof value === "string" ? value : "";
      }).join("")).join("\n");
      admit("note", text, `${path}.notes.html`);
    }
    if (notes.html !== undefined || notes.ops !== undefined) reportXmind(context, "fallback", `${path}.notes`, "Notes retain plain text; rich formatting is not represented.");
  }
  if (topic.markers !== undefined) for (const [index, value] of xmindArray(topic.markers, `${path}.markers`).entries()) {
    const marker = xmindRecord(value, `${path}.markers[${index}]`);
    reportXmindFields(marker, ["markerId"], `${path}.markers[${index}]`, context);
    if (typeof marker.markerId === "string" && ["priority-1", "priority-2", "priority-3"].includes(marker.markerId) && result.marker === undefined) admit("marker", marker.markerId, `${path}.markers[${index}]`);
    else reportXmind(context, "unsupported-field", `${path}.markers[${index}]`, "This additional marker is not represented.");
  }
  if (topic.image !== undefined) {
    const image = xmindRecord(topic.image, `${path}.image`), resource = xmindResourcePath(image.src);
    reportXmindFields(image, ["src", "width", "height"], `${path}.image`, context);
    const bytes = resource ? canvas.resources.readResource?.(resource) : undefined;
    if (!(bytes instanceof Uint8Array) || !resource?.toLowerCase().endsWith(".png") || bytes.length > 750000) reportXmind(context, "unsupported-field", `${path}.image`, "A bounded embedded PNG resource is required.");
    else {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const width = typeof image.width === "number" ? image.width : bytes.length >= 24 ? view.getUint32(16) : 0;
      const height = typeof image.height === "number" ? image.height : bytes.length >= 24 ? view.getUint32(20) : 0;
      const scale = Math.min(1, 512 / width, 512 / height);
      if (scale < 1 || width !== Math.round(width) || height !== Math.round(height)) reportXmind(context, "fallback", `${path}.image`, "Image display dimensions reduced to the portable range.");
      admit("image", { dataUrl: xmindImageData(bytes), width: Math.round(width * scale), height: Math.round(height * scale), alt: "" }, `${path}.image`);
    }
  }
  return readMindMapDetails(result);
}
