import type { QuireJSONContent } from "@quirekit/core";
import type { Schema } from "@quirekit/pm";
import type { BlockContentTemplate } from "../rich-content/types";
import { v4 } from "uuid";
const key = "quirekit:block-content-templates:v1";
/** @param content - Template blocks. @returns A copy without identities that must be regenerated on insertion. */
export function freshTemplateContent(content: readonly QuireJSONContent[]): QuireJSONContent[] {
  const notes = new Map<string, string>();
  /** @param node - Template subtree. @returns Independent identities with local note associations preserved. */
  function copy(node: QuireJSONContent): QuireJSONContent {
    const attrs = {...node.attrs}; delete attrs.blockId;
    if (["footnoteReference", "footnoteDefinition"].includes(node.type ?? "") && typeof attrs.noteId === "string") {
      if (!notes.has(attrs.noteId)) notes.set(attrs.noteId, v4());
      attrs.noteId = notes.get(attrs.noteId)!;
    }
    return {...node, ...(node.attrs ? {attrs}:{}), ...(node.content ? {content:node.content.map(copy)}:{})};
  }
  return content.map(copy);
}
/** @param schema - Installed document model. @param content - Template input. @returns User-facing unsupported reason or empty. */
export function templateError(schema: Schema, content: readonly QuireJSONContent[]): string {
  try {
    if (!content.length) return "模板没有内容";
    for (const item of content) { const node = schema.nodeFromJSON(item); node.check(); if (!node.isBlock) return "模板必须包含完整内容块"; }
    const references = new Set<string>(), definitions = new Map<string, number>();
    /** @param node - Candidate template subtree. */
    function inspect(node: QuireJSONContent): void {
      const id = String(node.attrs?.noteId ?? "");
      if (node.type === "footnoteReference") references.add(id);
      if (node.type === "footnoteDefinition") definitions.set(id, (definitions.get(id) ?? 0) + 1);
      node.content?.forEach(inspect);
    }
    content.forEach(inspect);
    if ([...references].some(id => !id || definitions.get(id) !== 1) || [...definitions].some(([id]) => !references.has(id)))
      return "脚注模板需要同时包含正文引用和完整脚注";
    return "";
  } catch { return "当前编辑器未安装此模板所需的内容类型"; }
}
/** @param storage - Host-owned local preference store. @returns Saved custom recipes; corrupt data never replaces the document. */
export function readBlockTemplates(storage: Storage): BlockContentTemplate[] {
  try {
    const items: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    return Array.isArray(items) ? items.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.content)).slice(0,20) : [];
  } catch { return []; }
}
/** @param storage - Local preference store. @param items - Current custom recipes. */
export function writeBlockTemplates(storage: Storage, items: readonly BlockContentTemplate[]): void {
  if (items.length > 20) throw new Error("最多保存 20 个自定义模板");
  storage.setItem(key, JSON.stringify(items));
}
