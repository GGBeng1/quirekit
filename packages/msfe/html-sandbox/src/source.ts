import type { SourceDocument, SourceNode, SourceEdit } from "@quirekit/msfe-core";
import { readHtmlSandboxFence, writeHtmlSandboxFence } from "@quirekit/html-sandbox/markdown";
import type { MsfeHtmlSandboxAttributes } from "./types";
/** Recognize only explicitly closed top-level executable fences.
 * @param document - Canonical Markdown. @param node - Parser-owned node. @returns Valid attributes or source fallback.
 */
export function readHtmlSandboxSource(document: SourceDocument, node: SourceNode): MsfeHtmlSandboxAttributes | null {
  if (node.parentKind !== "Document" || node.children("CodeMark").length !== 2) return null;
  const value = readHtmlSandboxFence(document.slice(node.from, node.to));
  return value?.closed ? { html: value.html } : null;
}
/** @param document - Canonical source. @param node - Existing fence. @param patch - Source-only replacement. @returns One canonical source edit or refusal. */
export function patchHtmlSandboxSource(document: SourceDocument, node: SourceNode, patch: Partial<MsfeHtmlSandboxAttributes>): SourceEdit | null {
  if (!readHtmlSandboxSource(document, node) || typeof patch.html !== "string" || Object.keys(patch).some(key => key !== "html")) return null;
  return { from: node.from, to: node.to, insert: writeHtmlSandboxFence(patch.html) };
}
