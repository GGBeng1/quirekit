import type { Node } from "@quirekit/pm";
import { createWordNumberingInstance, getDefaultWordAbstractNumId, type WordNumberingRegistry } from "@quirekit/classic-numbering-model";
import type { FlattenedList } from "./types";

/** @param node - Legacy schema node. @returns Whether this is a generic list container. */
export function isListContainer(node: Node): boolean { return node.type.name === "bulletList" || node.type.name === "orderedList"; }

/**
 * Converts losslessly representable wrapper items into the existing flat model.
 * @param root - Legacy list root.
 * @param initial - Existing canonical registry.
 * @param depth - Nesting level inherited from its parent list.
 * @returns Atomic conversion, or null to preserve a complex wrapper unchanged.
 */
export function flattenList(root: Node, initial: WordNumberingRegistry, depth = 0): FlattenedList | null {
  if (depth > 8 || !isListContainer(root)) return null;
  const nodes: Node[] = [], positions: { before: number; after: number; size: number }[] = [];
  const kind = root.type.name === "orderedList" ? "ordered" : "bullet";
  const created = createWordNumberingInstance(initial, getDefaultWordAbstractNumId(kind));
  let registry = created.registry, offset = 0, failed = false;
  root.forEach((item, itemOffset, index) => {
    const first = item.firstChild;
    if (item.type.name !== "listItem" || !first || !["paragraph", "heading"].includes(first.type.name)) { failed = true; return; }
    for (let child = 1; child < item.childCount; child++) if (!isListContainer(item.child(child))) { failed = true; return; }
    const start = kind === "ordered" && index === 0 ? root.attrs.start : null;
    if (start !== null && (!Number.isSafeInteger(start) || start < 1)) { failed = true; return; }
    positions.push({ before: itemOffset + 2, after: offset, size: first.nodeSize });
    nodes.push(first.type.create({ ...first.attrs, wordNumbering: {
      numId: created.numId, level: depth, startOverride: start === 1 ? null : start, task: null
    } }, first.content, first.marks));
    offset += first.nodeSize;
    item.forEach((child, childOffset, childIndex) => {
      if (childIndex === 0) return;
      const nested = flattenList(child, registry, depth + 1);
      if (!nested) { failed = true; return; }
      positions.push(...nested.positions.map(position => ({ ...position, before: itemOffset + 2 + childOffset + position.before, after: offset + position.after })));
      registry = nested.registry;
      nodes.push(...nested.nodes);
      offset += nested.nodes.reduce((sum, node) => sum + node.nodeSize, 0);
    });
  });
  return failed ? null : { nodes, positions, registry };
}
