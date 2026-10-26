import type { SourceDocument, SourceNode, SourceEdit } from "@quirekit/msfe-core";
import { parseDataView, dataViewMarkdown } from "@quirekit/data-view";
import type { MsfeDataViewAttributes } from "./types";

/** Decodes only complete standalone fences; unsupported data remains literal source.
 * @param document - Accepted source text.
 * @param node - Parser-confirmed fence.
 * @returns Valid semantic attributes, or unchanged-source fallback.
 */
export function readDataViewSource(document: SourceDocument, node: SourceNode): MsfeDataViewAttributes | null {
  const info = node.child("CodeInfo"), edges = node.children("CodeMark");
  if (node.parentKind !== "Document" || !info || edges.length !== 2 || document.slice(info.from, info.to).trim() !== "quirekit-data-view") return null;
  const body = document.slice(document.lineAt(edges[0]!.to).to + 1, document.lineAt(edges[1]!.from).from);
  try { return {dataView: parseDataView(body)}; } catch { return null; }
}
/** Patches one identity-preserving complete source object.
 * @param document - Current source.
 * @param node - Exact fence.
 * @param patch - Proposed attributes.
 * @returns Complete fence replacement or refusal.
 */
export function patchDataViewSource(document: SourceDocument, node: SourceNode, patch: Partial<MsfeDataViewAttributes>): SourceEdit | null {
  const current = readDataViewSource(document, node);
  if (!current || !patch.dataView || Object.keys(patch).some(key => key !== "dataView") || patch.dataView.id !== current.dataView.id) return null;
  try { return {from: node.from, to: node.to, insert: dataViewMarkdown(patch.dataView)}; } catch { return null; }
}
