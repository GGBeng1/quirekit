import { readMindMapDocument } from "../model/document";
import type { MindMapDocument, MindMapNode } from "../model/types";
import type { MindMapTextDiagnostic, MindMapTextExport, MindMapTextFormat } from "./types";
/** @param document - Full source including hidden topics. @param format - Chosen outline syntax.
 * @returns Complete topic text and a ledger for fields absent from the chosen format. */
export function exportMindMapText(document: MindMapDocument, format: MindMapTextFormat): MindMapTextExport {
  if (!["markdown", "outline"].includes(format)) throw new TypeError("outline: unsupported format");
  const source = readMindMapDocument(document), lines: string[] = [], diagnostics: MindMapTextDiagnostic[] = [];
  const omissions = new Set<string>();
  /** @param node - Complete topic. @param depth - Tree-local depth. @param path - Portable source location. */
  function visit(node: MindMapNode, depth: number, path: string): void {
    if (node.style) omissions.add("style"); if (node.details) omissions.add("details"); if (node.collapsed) omissions.add("collapsed"); if (node.side) omissions.add("side");
    if (node.text.includes("\n") && diagnostics.length < 1000) diagnostics.push({ code: "fallback", path: `${path}.text`, message: "Multiline topic joined onto one outline line." });
    let text = node.text.replace(/\n/gu, " / ");
    if ((format === "outline" || depth === 0) && /^[ \t]/u.test(text)) { text = text.trimStart(); if (diagnostics.length < 1000) diagnostics.push({ code: "fallback", path: `${path}.text`, message: "Leading whitespace removed because it denotes outline structure." }); }
    if (format === "outline" && !text.trim()) { text = "(empty topic)"; if (diagnostics.length < 1000) diagnostics.push({ code: "fallback", path: `${path}.text`, message: "Empty topic represented by a label because blank outline lines are separators." }); }
    if (format === "markdown") text = text.replace(/[\\`*_{}\[\]()#+.!<>-]/gu, "\\$&");
    lines.push(format === "markdown" && depth === 0 ? `# ${text}` : `${"  ".repeat(format === "markdown" ? depth - 1 : depth)}${format === "markdown" ? "- " : ""}${text}`);
    node.children.forEach((child, index) => visit(child, depth + 1, `${path}.children[${index}]`));
  }
  visit(source.root, 0, "root");
  for (const [index, topic] of (source.floatingTopics ?? []).entries()) { if (format === "markdown") lines.push(""); visit(topic.root, 0, `floatingTopics[${index}].root`); }
  if (source.floatingTopics?.length) omissions.add("floatingTopics.position"); if (source.annotations?.length) omissions.add("annotations");
  for (const field of ["id", "revision", "layout", ...omissions]) diagnostics.push({ code: "unsupported-field", path: field, message: "This source field is absent from a topic-text outline; retain native JSON for a lossless copy." });
  const text = lines.join("\n"); if (text.length > 4000000) throw new RangeError("outline: output budget exceeded");
  return Object.freeze({ text, diagnostics: Object.freeze(diagnostics) });
}
