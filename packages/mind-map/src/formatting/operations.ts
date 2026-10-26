import { readMindMapDocument } from "../model/document";
import type { MindMapDocument, MindMapNode } from "../model/types";
import { readMindMapStyle, readMindMapStylePatch } from "./validation";
import type { MindMapStylePatch } from "./types";

/**
 * Applies one atomic explicit-format change without altering host revision or hierarchy.
 * @param document - Portable source.
 * @param ids - Explicit selected topics, including possible overlapping descendants.
 * @param patch - Property updates; null clears all explicit formatting.
 * @returns Immutable upgraded document, or the original identity for a no-op.
 */
export function formatMindMapTopics(document: MindMapDocument, ids: readonly string[], patch: MindMapStylePatch | null): MindMapDocument {
  const updates = patch === null ? null : readMindMapStylePatch(patch), source = readMindMapDocument(document);
  const selected = new Set(ids); let changed = false;
  /** @param node - Original topic. @returns Topic retaining every other admitted field. */
  function visit(node: MindMapNode): MindMapNode {
    const children = node.children.map(visit);
    if (!selected.has(node.id)) return { ...node, children };
    const values: Record<string, unknown> = updates === null ? {} : { ...node.style };
    for (const [key, value] of Object.entries(updates ?? {})) {
      if (value === null) delete values[key]; else values[key] = value;
    }
    const style = readMindMapStyle(values);
    if (JSON.stringify(style) !== JSON.stringify(node.style ?? {})) changed = true;
    const { style: _old, ...rest } = node;
    return { ...rest, children, ...(Object.keys(style).length ? { style } : {}) };
  }
  // Traverse a detached forest once; validate the complete replacement before the
  // renderer or a host can observe any partial formatting operation.
  const root = visit(source.root), floatingTopics = (source.floatingTopics ?? []).map(topic => ({ ...topic, root: visit(topic.root) }));
  return changed ? readMindMapDocument({ ...source, version: Math.max(3, source.version), root, floatingTopics }) : document;
}
