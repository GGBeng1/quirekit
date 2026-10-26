import { createTreeCollection, type TreeCollection } from "@ark-ui/vue/tree-view";
import { computed, shallowRef, watch } from "vue";
import type { QuireKitTreeNode } from "../../components/tree-view";

/** Shared child list for leaves. */
const noChildren: readonly QuireKitTreeNode[] = Object.freeze([]);

/**
 * Keeps supplied and asynchronously loaded nodes in the same tree collection.
 * @param nodes - Current root nodes supplied by the consumer.
 * @param label - Accessible name for the collection's synthetic root.
 * @param checkable - Restricts cascade descendants to enabled subtrees.
 * @returns The replaceable collection and its current root children.
 */
export function useTreeCollection(nodes: () => readonly QuireKitTreeNode[], label: () => string, checkable: () => boolean = () => false) {
  /** Retains cascade eligibility after Ark replaces a collection during async loading.
   * @param collection - Newly created or loaded tree collection.
   */
  function adaptChecks(collection: TreeCollection<QuireKitTreeNode>): void {
    // Ark owns cascade state, but its descendant lookup includes disabled leaves.
    // Prune disabled paths at this boundary so checking a parent cannot select them.
    if (checkable()) {
      const descendants = collection.getDescendantValues;
      collection.getDescendantValues = (value, options) => {
        const original = descendants(value, options);
        const enabled = original.filter(id => {
          const node = collection.findNode(id);
          return node !== undefined && !node.disabled && !collection.getParentNodes(id).some(parent => parent.disabled);
        });
        // An entirely disabled branch still needs its real descendants for state display.
        // The checkbox adapter prevents activation when this pool has no enabled leaves.
        return enabled.length ? enabled : original;
      };
    }
  }

  /** @returns A collection with stable values, readable labels and disabled state. */
  function createCollection() {
    const collection = createTreeCollection<QuireKitTreeNode>({
      rootNode: { id: "__quirekit_tree_root__", label: label(), children: [...nodes()] },
      nodeToValue: node => node.id,
      nodeToString: node => node.label,
      isNodeDisabled: node => node.disabled === true,
      // Ark reads children on every node-state query; consumer arrays are immutable
      // snapshots, so share them instead of copying per query.
      nodeToChildren: node => (node.children ?? noChildren) as QuireKitTreeNode[],
      nodeToChildrenCount: node => node.childrenCount
        ?? (node.children === undefined ? undefined : node.children.length)
    });
    adaptChecks(collection);
    return collection;
  }

  const collection = shallowRef(createCollection());
  const rootNodes = computed(() => collection.value.getNodeChildren(collection.value.rootNode));
  watch([nodes, checkable], () => { collection.value = createCollection(); });
  /** @param next - Ark's collection after a successful asynchronous child load. */
  function replaceCollection(next: TreeCollection<QuireKitTreeNode>): void {
    adaptChecks(next);
    collection.value = next;
  }
  return { collection, rootNodes, replaceCollection };
}
