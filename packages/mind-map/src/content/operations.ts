import { readMindMapDocument } from "../model/document";
import type { MindMapDocument, MindMapNode } from "../model/types";
import { readMindMapDetails, readMindMapDetailsPatch } from "../details/validation";
import type { MindMapDetailsPatch } from "../details/types";
import type { MindMapContentUpdate } from "./types";

/**
 * Validates all fields and references before publishing a single forest update.
 * @param document - Immutable canonical source.
 * @param update - Explicit content mutations captured independently of selection.
 * @returns Original identity for a no-op, otherwise one complete validated source.
 */
export function applyMindMapContent(document: MindMapDocument, update: MindMapContentUpdate): MindMapDocument {
  if (!update.details?.length && !update.annotations?.length) return document;
  const source = readMindMapDocument(document), patches = new Map<string, (MindMapDetailsPatch | null)[]>();
  // Compile field validation once per intent; traversal consumes only admitted
  // patches and never depends on the renderer's current selection.
  for (const entry of update.details ?? []) {
    const patch = entry.patch === null ? null : readMindMapDetailsPatch(entry.patch);
    for (const id of new Set(entry.ids)) patches.set(id, [...(patches.get(id) ?? []), patch]);
  }
  const missing = new Set(patches.keys());
  /** @param node - Detached canonical node. @returns Topic with explicit edits and unchanged identity. */
  function visit(node: MindMapNode): MindMapNode {
    const children = node.children.map(visit), edits = patches.get(node.id);
    if (!edits) return { ...node, children };
    missing.delete(node.id);
    let fields: Record<string, unknown> = { ...node.details };
    for (const patch of edits) {
      if (patch === null) fields = {};
      else for (const [key, value] of Object.entries(patch)) { if (value === null) delete fields[key]; else fields[key] = value; }
    }
    const details = readMindMapDetails(fields), { details: _old, ...rest } = node;
    return { ...rest, children, ...(Object.keys(details).length ? { details } : {}) };
  }
  const root = visit(source.root), floatingTopics = (source.floatingTopics ?? []).map(topic => ({ ...topic, root: visit(topic.root) }));
  if (missing.size) throw new TypeError("details: target topic no longer exists");
  const annotations = new Map((source.annotations ?? []).map(item => [item.id, item]));
  for (const item of update.annotations ?? []) annotations.set(item.id, item);
  // Final model admission checks cross-object references and aggregate image
  // budgets before the caller can publish any member of this batch.
  const result = readMindMapDocument({ ...source, version: Math.max(5, source.version), root, floatingTopics, annotations: [...annotations.values()] });
  const same = JSON.stringify([result.root, result.floatingTopics ?? [], result.annotations ?? []])
    === JSON.stringify([source.root, source.floatingTopics ?? [], source.annotations ?? []]);
  return same ? document : result;
}
