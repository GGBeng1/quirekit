import { readMindMapDocument, readMindMapEmbed } from "@quirekit/mind-map";
import type { MindEditorFile } from "./types";

/** @param file - Explicitly chosen local JSON or XMind archive. @returns All validated canvases and conversion differences. */
export async function readMindEditorFile(file: File): Promise<MindEditorFile> {
  const archive = /\.xmind$/iu.test(file.name);
  const limit = archive ? 32000000 : 4000000;
  if (file.size > limit) throw new RangeError(archive ? "XMind 文件不能超过 32 MB" : "JSON 文件不能超过 4 MB");
  if (archive) {
    const { importXmindFile } = await import("@quirekit/mind-map/xmind");
    return { name: file.name, ...await importXmindFile(new Uint8Array(await file.arrayBuffer())) };
  }
  if (/\.(?:md|markdown|txt)$/iu.test(file.name)) {
    const { importMindMapText } = await import("@quirekit/mind-map/text");
    const result = importMindMapText(await file.text(), /\.txt$/iu.test(file.name) ? "outline" : "markdown");
    return { name: file.name, sheets: [{ title: result.document.root.text, document: result.document }], diagnostics: result.diagnostics };
  }
  const value: unknown = JSON.parse(await file.text());
  if (Array.isArray(value)) {
    const { parseXmindContent } = await import("@quirekit/mind-map/xmind");
    return { name: file.name, ...parseXmindContent(value) };
  }
  const embed = value && typeof value === "object" && "type" in value && value.type === "quirekit-mind-map-embed"
    ? readMindMapEmbed(value) : null;
  const document = embed?.document ?? readMindMapDocument(value);
  return { name: file.name, sheets: [{ title: embed?.title ?? document.root.text, document }], diagnostics: [] };
}
