import { WhiteboardError } from "./error";
import type { WhiteboardDocument, WhiteboardScene } from "./types";
import { previewAddress } from "./address";

/** Maximum encoded source plus preview; hosts may impose a tighter storage quota. */
export const whiteboardMaximumBytes = 16 * 1024 * 1024;
const raster = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/\r\n]+={0,2}$/u;
const elementTypes = new Set(["rectangle", "diamond", "ellipse", "arrow", "line", "freedraw", "text", "image", "frame", "magicframe"]);

/** @param value - Untrusted input. @returns Plain record without array or null. */
export function whiteboardRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param value - JSON tree. @param depth - Current bounded nesting. */
function validateJson(value: unknown, depth = 0): void {
  if (depth > 64) throw new WhiteboardError("nested", "白板数据嵌套过深");
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) { value.forEach(item => validateJson(item, depth + 1)); return; }
  if (!whiteboardRecord(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new WhiteboardError("portable", "白板必须是可移植的 JSON 数据");
  for (const [key, item] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw new WhiteboardError("field", "白板包含不支持的字段");
    validateJson(item, depth + 1);
  }
}

/** @param value - Unknown source. @returns Validated native scene without modifying its fields. */
export function readWhiteboardScene(value: unknown): WhiteboardScene {
  validateJson(value);
  if (!whiteboardRecord(value) || value.type !== "excalidraw" || value.version !== 2 || typeof value.source !== "string"
    || !Array.isArray(value.elements) || !whiteboardRecord(value.appState) || !whiteboardRecord(value.files)) throw new WhiteboardError("format", "不支持的 Excalidraw 文件格式");
  if (value.elements.length > 10_000) throw new WhiteboardError("elementLimit", "白板最多支持 10,000 个元素");
  const ids = new Set<string>();
  for (const element of value.elements) {
    if (!whiteboardRecord(element) || typeof element.id !== "string" || !element.id || ids.has(element.id)
      || !elementTypes.has(String(element.type))) throw new WhiteboardError("element", "白板元素类型或身份无效；暂不支持网页嵌入");
    ids.add(element.id);
    for (const key of ["x", "y", "width", "height"]) {
      if (typeof element[key] !== "number" || !Number.isFinite(element[key]) || Math.abs(element[key]) > 10_000_000) throw new WhiteboardError("dimensions", "白板元素尺寸无效");
    }
    if (element.type === "image" && !element.isDeleted && (typeof element.fileId !== "string" || !value.files[element.fileId])) throw new WhiteboardError("missingImage", "白板缺少图片文件，请等待图片加载后重试");
  }
  for (const [id, file] of Object.entries(value.files)) {
    if (!whiteboardRecord(file) || file.id !== id || typeof file.dataURL !== "string" || !raster.test(file.dataURL)) throw new WhiteboardError("imageFormat", "白板图片必须是内嵌 PNG、JPEG、WebP 或 GIF");
  }
  return value as unknown as WhiteboardScene;
}

/** @param value - Untrusted envelope. @returns Detached validated document. */
export function readWhiteboardDocument(value: unknown): WhiteboardDocument {
  validateJson(value);
  if (!whiteboardRecord(value) || value.type !== "quirekit-whiteboard" || (value.version !== 1 && value.version !== 2)
    || typeof value.id !== "string" || !value.id || value.id.length > 160 || typeof value.title !== "string" || value.title.length > 200
    || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0) throw new WhiteboardError("documentFormat", "不支持的白板文档版本或属性");
  readWhiteboardScene(value.scene);
  const preview = value.preview;
  if (preview !== null && (!whiteboardRecord(preview) || !validPreviewImage(preview, value.version) || !Number.isSafeInteger(preview.width) || !Number.isSafeInteger(preview.height)
    || Number(preview.width) < 1 || Number(preview.height) < 1 || Number(preview.width) > 4096 || Number(preview.height) > 4096)) throw new WhiteboardError("previewInvalid", "白板预览无效");
  // Inline-only envelopes keep version 1 so readers older than the linked form still open them.
  const json = JSON.stringify({ ...value, version: preview !== null && whiteboardRecord(preview) && "url" in preview ? 2 : 1 });
  // Bound encoded storage without depending on a browser TextEncoder.
  if (json.length > whiteboardMaximumBytes || utf8Size(json) > whiteboardMaximumBytes) throw new WhiteboardError("tooLarge", "白板超过 16 MB，请减少图片或元素后再保存");
  return JSON.parse(json) as WhiteboardDocument;
}

/** @param preview - Untrusted preview record. @param version - Envelope version; only version 2 may link.
 * @returns Whether it holds exactly one valid image form. */
function validPreviewImage(preview: Record<string, unknown>, version: unknown): boolean {
  if ("url" in preview) {
    if (version !== 2 || "dataUrl" in preview) return false;
    try { previewAddress(preview.url); return true; } catch { return false; }
  }
  return typeof preview.dataUrl === "string" && preview.dataUrl.startsWith("data:image/png;base64,") && raster.test(preview.dataUrl);
}

/** @param text - Valid JSON text. @returns UTF-8 byte length, including surrogate pairs. */
function utf8Size(text: string): number {
  let bytes = 0;
  for (const character of text) { const point = character.codePointAt(0)!; bytes += point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4; }
  return bytes;
}
