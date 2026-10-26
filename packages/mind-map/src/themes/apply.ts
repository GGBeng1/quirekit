import { readMindMapDocument, serializeMindMap } from "../model/document";
import type { MindMapDocument, MindMapNode } from "../model/types";
import { templateNodeStyle } from "../templates/style";
import { palettes } from "../templates/recipes/palettes";
import type { MindMapThemeId } from "./types";

/**
 * Replaces whole-map appearance without replacing content, identity or arrangement.
 * @param document - Canonical source including hidden and floating descendants.
 * @param id - Original palette identity.
 * @returns One immutable styled source, or the original object for an identical result.
 */
export function applyMindMapTheme(document: MindMapDocument, id: MindMapThemeId): MindMapDocument {
  if (!Object.hasOwn(palettes, id)) throw new RangeError("theme: unknown identity");
  const source = readMindMapDocument(document);
  const design = { palette: palettes[id], shape: id === "ink" || id === "slate" ? "rectangle" as const : "rounded" as const,
    line: id === "slate" ? "elbow" as const : id === "ink" ? "direct" as const : "curve" as const, leaves: "card" as const };
  /** @param node - Original topic. @param depth - Tree-local level. @param branch - Palette lane. @returns Styled topic retaining all semantic fields. */
  function visit(node: MindMapNode, depth: number, branch: number): MindMapNode {
    return { ...node, style: templateNodeStyle(design, depth, branch),
      children: node.children.map((child, index) => visit(child, depth + 1, depth === 0 ? index : branch)) };
  }
  // Style replacement is explicit and atomic. No role or theme marker is persisted,
  // so exports and all hosts consume the same admitted formatting fields.
  const next = readMindMapDocument({ ...source, version: Math.max(3, source.version), root: visit(source.root, 0, 0),
    floatingTopics: (source.floatingTopics ?? []).map((topic, index) => ({ ...topic, root: visit(topic.root, 1, index) })) });
  return serializeMindMap(next) === serializeMindMap(source) ? document : next;
}
