import { readMindMapDocument } from "../model/document";
import type { MindMapDocument, MindMapNode } from "../model/types";
import { readMindMapDetails, readMindMapDetailsPatch } from "./validation";
import type { MindMapDetailsPatch } from "./types";

/** @param document - Canonical source. @param ids - Explicit targets. @param patch - Field edits, or null to clear.
 * @returns One validated source replacement, or original identity for an unchanged value. */
export function setMindMapTopicDetails(document: MindMapDocument, ids: readonly string[], patch: MindMapDetailsPatch | null): MindMapDocument {
  const fields = patch === null ? null : readMindMapDetailsPatch(patch), source = readMindMapDocument(document);
  const targets = new Set(ids), missing = new Set(ids); let changed = false;
  /** @param node - Detached topic. @returns Topic with only explicit fields modified. */
  function visit(node: MindMapNode): MindMapNode {
    const children = node.children.map(visit);
    if (!targets.has(node.id)) return { ...node, children };
    missing.delete(node.id);
    const updated: Record<string, unknown> = fields === null ? {} : { ...node.details };
    for (const [key, value] of Object.entries(fields ?? {})) { if (value === null) delete updated[key]; else updated[key] = value; }
    const details = readMindMapDetails(updated);
    changed ||= JSON.stringify(details) !== JSON.stringify(node.details ?? {});
    const { details: _old, ...rest } = node;
    return { ...rest, children, ...(Object.keys(details).length ? { details } : {}) };
  }
  const root = visit(source.root), floatingTopics = (source.floatingTopics ?? []).map(topic => ({ ...topic, root: visit(topic.root) }));
  if (missing.size) throw new TypeError("details: target topic no longer exists");
  return changed ? readMindMapDocument({ ...source, version: Math.max(5, source.version), root, floatingTopics, annotations: source.annotations ?? [] }) : document;
}
