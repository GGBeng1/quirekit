import type { OmmlElement, OmmlNode } from "../types";

/** Namespaces declared on a standalone formula. */
const namespaces = {
  "xmlns:m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
  "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
};

/**
 * Escapes XML text or attribute content.
 * @param value - Raw value.
 * @returns Escaped value.
 */
function escape(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}

/**
 * Serializes one preserve-order node.
 * @param node - Element or text.
 * @param extra - Attributes added to this element.
 * @returns XML text.
 */
function write(node: OmmlNode, extra: Readonly<Record<string, string>> = {}): string {
  if ("#text" in node) return escape(String(node["#text"]));
  const tag = Object.keys(node).find(key => key !== ":@")!;
  const attributes = Object.entries((node[":@"] ?? {}) as Record<string, string>).map(([key, value]) => [key.replace(/^@_/u, ""), value] as const);
  const head = [tag, ...[...Object.entries(extra), ...attributes].map(([key, value]) => `${key}="${escape(value)}"`)].join(" ");
  const children = node[tag] as readonly OmmlNode[];
  return children.length === 0 ? `<${head}/>` : `<${head}>${children.map(child => write(child)).join("")}</${tag}>`;
}

/**
 * Serializes a formula element as standalone OMML XML.
 * @param element - `m:oMathPara` or `m:oMath`.
 * @param options - Whether to declare the `m` and `w` namespaces on the root (default true).
 * @returns XML text.
 */
export function serializeOmml(element: OmmlElement, options: { readonly namespaces?: boolean } = {}): string {
  return write(element, options.namespaces === false ? {} : namespaces);
}
