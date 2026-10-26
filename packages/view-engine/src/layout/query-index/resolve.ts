import type {
  QuireLayoutInteractionQueryEntry,
  QuireLayoutNode
} from "../types";

/**
 * Keeps the shallowest candidates when an ancestor and its descendants are both indexed.
 *
 * @param entries - Candidate entries in preorder.
 * @returns Entries whose ancestors are not already present in the candidate set.
 */
export function filterQuireLayoutInteractionQueryEntriesToShallowest(
  entries: readonly QuireLayoutInteractionQueryEntry[]
): readonly QuireLayoutInteractionQueryEntry[] {
  const shallowEntries: QuireLayoutInteractionQueryEntry[] = [];

  for (const entry of entries) {
    if (
      shallowEntries.some((candidate) =>
        isQuireLayoutInteractionQueryEntryAncestor(candidate, entry)
      )
    ) {
      continue;
    }

    shallowEntries.push(entry);
  }

  return shallowEntries;
}

/**
 * Resolves one indexed layout-node entry against the snapshot root.
 *
 * @param root - Snapshot root that owns the indexed node tree.
 * @param entry - Entry to resolve.
 * @returns Resolved layout node, or null when the entry no longer matches the root.
 */
export function resolveQuireLayoutInteractionQueryEntryNode(
  root: QuireLayoutNode,
  entry: QuireLayoutInteractionQueryEntry
): QuireLayoutNode | null {
  let children = root.children ?? [];
  let node: QuireLayoutNode | undefined;

  for (const childIndex of entry.path) {
    node = children[childIndex];

    if (node === undefined) {
      return null;
    }

    children = node.children ?? [];
  }

  return node?.id === entry.nodeId ? node : null;
}

/**
 * Resolves multiple indexed layout-node entries against the snapshot root.
 *
 * @param root - Snapshot root that owns the indexed node tree.
 * @param entries - Entries to resolve.
 * @returns Resolved layout nodes in entry order.
 */
export function resolveQuireLayoutInteractionQueryEntryNodes(
  root: QuireLayoutNode,
  entries: readonly QuireLayoutInteractionQueryEntry[]
): readonly QuireLayoutNode[] {
  const nodes: QuireLayoutNode[] = [];

  for (const entry of entries) {
    const node = resolveQuireLayoutInteractionQueryEntryNode(root, entry);

    if (node !== null) {
      nodes.push(node);
    }
  }

  return nodes;
}

/**
 * Checks whether one interaction entry is an ancestor of another entry.
 *
 * @param ancestor - Candidate ancestor entry.
 * @param descendant - Candidate descendant entry.
 * @returns Whether the ancestor path prefixes the descendant path.
 */
function isQuireLayoutInteractionQueryEntryAncestor(
  ancestor: QuireLayoutInteractionQueryEntry,
  descendant: QuireLayoutInteractionQueryEntry
): boolean {
  return ancestor.path.length < descendant.path.length &&
    ancestor.path.every((part, index) => descendant.path[index] === part);
}
