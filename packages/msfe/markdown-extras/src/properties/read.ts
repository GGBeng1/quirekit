import { isAlias, isMap, isNode, isScalar, isSeq, parseDocument, visit, type Node } from "yaml";
import type { DocumentPropertiesData, DocumentProperty, DocumentPropertyScalar, DocumentPropertyValue } from "./types";

/** Fixed work and memory bound for optional metadata decoding. */
export const DOCUMENT_PROPERTIES_LIMIT = 20_000;

/** @param value - Parsed primitive. @returns Whether a value can round-trip without custom YAML semantics. */
function scalar(value: unknown): value is DocumentPropertyScalar {
  return value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value);
}

/** @param node - Parsed value. @returns Its decoded flat value, or undefined for source-only structure. */
function valueOf(node: Node | null): DocumentPropertyValue | undefined {
  if (isScalar(node) && scalar(node.value)) return node.value;
  if (isSeq(node) && node.items.every(item => isScalar(item) && scalar(item.value))) return node.items.map(item => (item as { value: DocumentPropertyScalar }).value);
  return undefined;
}

/**
 * Reads only a closed, bounded YAML map; unsafe or ambiguous syntax remains source.
 * @param source - Canonical Markdown or a bounded prefix containing the entire header.
 * @returns Exact header snapshot, or null without a supported header.
 */
export function readDocumentProperties(source: string): DocumentPropertiesData | null {
  const prefix = source.slice(0, DOCUMENT_PROPERTIES_LIMIT), open = /^(?:\uFEFF)?---[ \t]*\r?\n/u.exec(prefix);
  if (!open) return null;
  const rest = prefix.slice(open[0].length), close = /^---[ \t]*(?=\r?$)/mu.exec(rest);
  if (!close) return null;
  const insertAt = open[0].length + close.index, end = insertAt + close[0].length;
  const body = prefix.slice(open[0].length, insertAt);
  const document = parseDocument(body, { keepSourceTokens: true, uniqueKeys: true, strict: true, logLevel: "silent" });
  if (document.errors.length || document.warnings.length || document.contents !== null && (!isMap(document.contents) || document.contents.flow)) return null;
  let unsupported = false;
  visit(document, (_key, node) => { if (isAlias(node) || isNode(node) && (node.tag || "anchor" in node && node.anchor)) unsupported = true; });
  if (unsupported) return null;
  const entries: DocumentProperty[] = [];
  for (const pair of isMap(document.contents) ? document.contents.items : []) {
    if (!isScalar(pair.key) || typeof pair.key.value !== "string" || !pair.key.range || !isNode(pair.value) || !pair.value.range) return null;
    const key = pair.key, node = pair.value, value = valueOf(node);
    // Local insertion/removal assumes an ordinary root key at a line boundary.
    // Explicit, indented and multiline keys keep their original source presentation.
    if (key.range![0] > 0 && body[key.range![0] - 1] !== "\n" || /[\r\n]/u.test(body.slice(key.range![0], key.range![1]))) return null;
    let commentedList = false;
    if (isSeq(node)) visit(node, (_key, child) => { if (child !== node && isNode(child) && (child.comment || child.commentBefore)) commentedList = true; });
    entries.push({ key: key.value as string, ...(value === undefined ? {} : { value }), editable: value !== undefined && !commentedList,
      source: body.slice(node.range[0], node.range[1]), keyFrom: open[0].length + key.range![0], keyTo: open[0].length + key.range![1],
      valueFrom: open[0].length + node.range[0], valueTo: open[0].length + node.range[1] });
  }
  return { source: prefix.slice(0, end), insertAt, newline: open[0].endsWith("\r\n") ? "\r\n" : "\n", entries };
}
