import type { QuireKitTreeNode } from '../../components/tree-view';
import type { HierarchyEntry } from './types';

/** Projects inherited disabled state without mutating supplied nodes.
 * @param nodes - Siblings in source order.
 * @param disabled - Whether an ancestor is unavailable.
 * @returns A tree whose disabled branches cannot expose selectable descendants.
 */
export function prepareHierarchy(nodes: readonly QuireKitTreeNode[], disabled = false): QuireKitTreeNode[] {
  return nodes.map(node => ({ ...node, disabled: disabled || node.disabled === true,
    ...(node.children ? { children: prepareHierarchy(node.children, disabled || node.disabled === true) } : {}) }));
}

/** Indexes paths once, keeping search independent of the rendered tree.
 * @param nodes - Complete prepared hierarchy.
 * @param ancestors - Current ancestor chain.
 * @returns Depth-first entries for display, search and submission.
 */
export function hierarchyEntries(nodes: readonly QuireKitTreeNode[], ancestors: readonly QuireKitTreeNode[] = []): HierarchyEntry[] {
  const entries = nodes.flatMap(node => {
    const path = [...ancestors, node];
    return [{ node, path, leaf: !node.children?.length && !node.childrenCount, text: path.map(item => item.label).join(' / ') },
      ...hierarchyEntries(node.children ?? [], path)];
  });
  if (!ancestors.length) {
    const ids = new Set<string>();
    for (const { node } of entries) {
      if (!node.id || node.id === '__quirekit_tree_root__' || ids.has(node.id)) throw new Error(`Hierarchy ids must be nonempty and globally unique: ${node.id}`);
      ids.add(node.id);
    }
  }
  return entries;
}

/** Matches every query word anywhere in a full path.
 * @param entries - Eligible candidates.
 * @param query - User search string.
 * @returns Stable candidates with no change to selection or expansion.
 */
export function searchHierarchy(entries: readonly HierarchyEntry[], query: string): HierarchyEntry[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(entry => words.every(word => entry.text.toLocaleLowerCase().includes(word)));
}

/** Prevents upstream bulk selection from adding disabled or unknown candidates.
 * @param next - Requested complete selection.
 * @param previous - Current selection, including unavailable values.
 * @param entries - Current eligible candidates.
 * @returns New enabled values plus preserved unavailable values.
 */
export function protectSelection(next: readonly string[], previous: readonly string[], entries: readonly HierarchyEntry[]): string[] {
  const enabled = new Set(entries.filter(entry => !entry.node.disabled).map(entry => entry.node.id));
  return [...new Set([...next.filter(id => enabled.has(id)), ...previous.filter(id => !enabled.has(id))])];
}
