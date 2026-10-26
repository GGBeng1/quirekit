import { readMindMapDocument } from "../model/document";
import type { MindMapDocument } from "../model/types";
import { collapseStructureTree, copyStructureTree, locateStructureTopic } from "./tree";
import type { MindMapStructureCommand, MindMapStructureResult, MutableMindMapNode } from "./types";

/**
 * Applies one structural intent without changing host revision or mutating source references.
 * @param document - Complete canonical forest.
 * @param ids - Explicit selection; single-topic moves refuse ambiguous multi-selection.
 * @param command - Structural or recursive visibility intent.
 * @param createId - Host-independent identity allocator, required when inserting a parent.
 * @param parentText - Initial text for a newly inserted parent only.
 * @returns A validated atomic result, or the original document for a no-op.
 */
export function editMindMapStructure(document: MindMapDocument, ids: readonly string[], command: MindMapStructureCommand,
  createId?: () => string, parentText = "父主题"): MindMapStructureResult {
  const source = readMindMapDocument(document), root = copyStructureTree(source.root);
  const floating = (source.floatingTopics ?? []).map(topic => ({ ...topic, root: copyStructureTree(topic.root) }));
  const roots = [root, ...floating.map(topic => topic.root)], selection = [...new Set(ids)];
  const noop = { document, selectedIds: selection };
  /** @param selectedIds - Identities following a successful change. @returns Frozen model after all mutations validate. */
  function finish(selectedIds = selection): MindMapStructureResult {
    return { document: readMindMapDocument({ ...source, root,
      ...(source.version !== 1 ? { floatingTopics: floating } : {}) }), selectedIds };
  }

  // Visibility consumes each subtree once, including hidden topics, but never collapses the main root.
  if (["expand-selected", "collapse-selected", "expand-all", "collapse-all"].includes(command)) {
    const selected = new Set(command.endsWith("-all") ? roots.map(node => node.id) : selection);
    let changed = false;
    for (const tree of roots) changed = collapseStructureTree(tree, selected, command.startsWith("collapse"), root.id) || changed;
    return changed ? finish() : noop;
  }
  if (selection.length !== 1 || selection[0] === root.id) return noop;
  const location = roots.map(tree => locateStructureTopic(tree, selection[0]!)).find(Boolean);
  if (!location) return noop;
  const { node, parent, grandparent } = location;

  // Freeze layout-derived sides before changing root order, so unrelated branches do not jump across the root.
  if (source.layout === "mind-map") root.children.forEach((child, index) => { child.side ??= index % 2 === 0 ? "right" : "left"; });
  const siblings = parent?.children.filter(child => parent !== root || source.layout !== "mind-map" || child.side === node.side) ?? [];
  const index = siblings.indexOf(node), previous = siblings[index - 1], next = siblings[index + 1];
  if (command === "add-parent") {
    if (!createId) throw new TypeError("Inserting a parent requires an identity allocator");
    const wrapper: MutableMindMapNode = { id: createId(), text: parentText, collapsed: false, children: [node],
      ...(node.side ? { side: node.side } : {}) };
    delete node.side;
    if (parent) parent.children.splice(parent.children.indexOf(node), 1, wrapper);
    else floating.find(topic => topic.root === node)!.root = wrapper;
    return finish([wrapper.id]);
  }
  if (command === "indent") {
    if (!parent || !previous) return noop;
    parent.children.splice(parent.children.indexOf(node), 1);
    delete node.side; previous.children.push(node); previous.collapsed = false;
  } else if (command === "outdent") {
    if (!parent || !grandparent) return noop;
    parent.children.splice(parent.children.indexOf(node), 1);
    if (grandparent === root && parent.side) node.side = parent.side;
    grandparent.children.splice(grandparent.children.indexOf(parent) + 1, 0, node);
    grandparent.collapsed = false;
  } else if (command === "move-up" || command === "move-down") {
    const other = command === "move-up" ? previous : next;
    if (!parent || !other) return noop;
    const from = parent.children.indexOf(node), to = parent.children.indexOf(other);
    [parent.children[from], parent.children[to]] = [other, node];
  } else throw new TypeError("Unsupported mind map structure command");
  return finish();
}
